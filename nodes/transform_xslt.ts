import { spawn } from 'child_process';
import { TransformXsltRequest, TransformXsltResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, mapToObject, buildErrorMsg, NodeError } from './lib';
import { rejectUnsafeDispatch, detectOutputSpec, normalizeOutput, OutputSpec } from './xslt_lib';

// Absolute paths to xsltjs's and @xmldom/xmldom's entry points, resolved via
// this already-running process's own module resolution — correct whether
// this file executes from source (ts-jest) or a compiled dist/ build,
// without guessing a relative cwd. Passed into the worker below.
const XSLTJS_ENTRY = require.resolve('xsltjs');
const XMLDOM_ENTRY = require.resolve('@xmldom/xmldom');
const XSLTJS_UTILS_ENTRY = require.resolve('xsltjs/scripts/Utils.js');

// A THIRD independent review pass found that a plain in-thread
// `Promise.race`-based timeout (the previous approach) CANNOT bound a
// CPU-bound hang in xsltjs: Node is single-threaded, so a synchronous
// busy-loop inside XSLT.process starves the event loop and the timeout's
// own setTimeout callback never gets a turn to fire. Confirmed directly: an
// entirely ordinary nested xsl:for-each over a few hundred items ran for
// 470+ seconds, froze the whole dev process for OTHER concurrent requests
// too, and eventually OOM-crashed it — worse than the original hang, and a
// real DoS reachable by unremarkable, non-adversarial XSLT. The only
// mechanism that can actually preempt synchronous CPU-bound work is an OS
// signal delivered to a SEPARATE process — the same reason ValidateXsd runs
// libxml2-wasm in a child process (that one for an ESM/vm-sandbox reason,
// this one for a true preemption reason). The worker below runs the actual
// XSLT.process(...) call in a genuine child Node process; a timeout SIGKILLs
// it outright, which the OS enforces regardless of what the child's own
// JavaScript is doing.
const WORKER_SCRIPT = `
const { DOMParser } = require(${JSON.stringify(XMLDOM_ENTRY)});
const { XSLT } = require(${JSON.stringify(XSLTJS_ENTRY)});
const { Utils } = require(${JSON.stringify(XSLTJS_UTILS_ENTRY)});
// Same SSRF guard as the in-process path used to apply — must be re-applied
// here since this is a fresh process with its own require cache.
Utils.fetch = async (url) => { throw new Error('network/document() access is disabled for this node: blocked fetch of "' + url + '"'); };

let chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', async () => {
  const respond = (obj) => { process.stdout.write(JSON.stringify(obj)); };
  try {
    const { xml, xslt, params } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const inputDoc = new DOMParser().parseFromString(xml, 'text/xml');
    const xsltDoc = new DOMParser().parseFromString(xslt, 'text/xml');
    const output = await XSLT.process(inputDoc, xsltDoc, params, {});
    respond({ output });
  } catch (e) {
    respond({ error: { code: 'INVALID_XSLT', message: String((e && e.message) || e) } });
  }
});
`;

const TRANSFORM_TIMEOUT_MS = 5000;
// Bounds a single transform's memory independent of the timeout — the
// OOM crash the third review pass observed happened WITHIN the timeout
// window (a hang isn't the only way pathological input can hurt this node).
const WORKER_MAX_OLD_SPACE_MB = 256;

function runXsltWorker(xml: string, xslt: string, params: Record<string, string>): Promise<{ output?: string; error?: { code: string; message: string } }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`--max-old-space-size=${WORKER_MAX_OLD_SPACE_MB}`, '-e', WORKER_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      child.kill('SIGKILL');
      reject(new NodeError('INVALID_XSLT', `XSLT transform did not complete within ${TRANSFORM_TIMEOUT_MS}ms`));
    }, TRANSFORM_TIMEOUT_MS);

    child.stdout.on('data', (c) => {
      stdout += c;
    });
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new NodeError('INVALID_XSLT', `xslt transform worker failed to start: ${e.message}`));
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!stdout.trim()) {
        // No output before exit has two known causes, distinguished by exit
        // code: a non-zero/signal exit means the process was actually
        // killed (our own SIGKILL races this same 'close' handler and is
        // handled above via `settled`, so a non-zero code reaching here is
        // the OS killing it for another reason — most likely the
        // --max-old-space-size cap). A clean exit code 0 with no output
        // means something subtler and worth being honest about: some of
        // xsltjs's dispatch hangs are an awaited Promise that simply never
        // settles, with nothing else keeping the child's event loop alive —
        // Node exits on its own once the loop drains, orphaning that
        // pending await, rather than actually hanging. Either way the
        // transform did not complete; only the reason differs.
        const reason =
          code === 0
            ? 'the underlying engine never resolved or rejected the transform, and nothing else kept the ' +
              'worker process alive, so it exited on its own'
            : `the process was killed (code/signal ${code}), most likely for exceeding its ` +
              `${WORKER_MAX_OLD_SPACE_MB} MB memory bound`;
        reject(
          new NodeError(
            'INVALID_XSLT',
            `xslt transform did not complete — ${reason}: ${stderr.slice(0, 500)}`,
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new NodeError('INVALID_XSLT', `xslt transform worker returned malformed output: ${stdout.slice(0, 500)}`));
      }
    });

    child.stdin.write(JSON.stringify({ xml, xslt, params }));
    child.stdin.end();
  });
}

/**
 * Transform an XML document with a caller-supplied XSLT 1.0 stylesheet,
 * returning the serialized output and the stylesheet's effective output
 * method (xml/html/text). Optional params override the stylesheet's
 * top-level xsl:param values.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function transformXslt(ax: AxiomContext, input: TransformXsltRequest): Promise<TransformXsltResult> {
  const result = new TransformXsltResult();
  try {
    const xmlText = input.getXml();
    const xsltText = input.getXslt();
    // parseXmlDom (depth-bounded, XXE-safe) is used here purely for the
    // static rejectUnsafeDispatch/detectOutputSpec checks below — these run
    // in THIS process because they are simple, fast, non-hanging XPath
    // lookups, not the actual transform.
    parseXmlDom(xmlText);
    let xsltDoc: any;
    try {
      xsltDoc = parseXmlDom(xsltText, { label: 'xslt' });
    } catch (e) {
      // parseXmlDom always reports INVALID_XML — remap a well-formedness
      // failure specifically on the STYLESHEET argument to INVALID_XSLT,
      // which is what this node's Error.code vocabulary documents for a
      // malformed stylesheet.
      if (e instanceof NodeError && e.code === 'INVALID_XML') {
        throw new NodeError('INVALID_XSLT', e.message);
      }
      throw e;
    }

    rejectUnsafeDispatch(xsltDoc);
    const spec: OutputSpec = detectOutputSpec(xsltDoc);
    const params = mapToObject(input.getParamsMap());

    const workerResult = await runXsltWorker(xmlText, xsltText, params);
    if (workerResult.error) {
      throw new NodeError(workerResult.error.code, workerResult.error.message);
    }

    result.setOutput(normalizeOutput(workerResult.output || '', spec));
    result.setOutputMethod(spec.method);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XSLT'));
  }
  return result;
}
