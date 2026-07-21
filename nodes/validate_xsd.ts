import { spawn } from 'child_process';
import { ValidateXsdRequest, ValidateXsdResult, ValidationViolation } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { buildErrorMsg, NodeError, MAX_XML_BYTES, MAX_XSD_BYTES } from './lib';

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

// The absolute path to libxml2-wasm's ESM entry point, resolved via this
// already-running process's own (perfectly ordinary) module resolution — so
// it is correct whether this file is executing from source (ts-jest) or
// from a compiled dist/ build, without guessing a relative cwd. Passed into
// the worker below so IT never has to resolve the bare specifier itself.
const LIBXML2_WASM_ENTRY = require.resolve('libxml2-wasm');

// libxml2-wasm ships ESM-only (no CJS build, and its top-level await rules
// out even Node's own require(esm) support). A plain `await import(...)`
// works fine in a normal Node process (confirmed directly), but this node's
// unit tests run inside Jest's sandboxed vm.Context, which only supports
// dynamic import() when the OS process was started with
// --experimental-vm-modules — a flag this package cannot force onto
// whatever harness eventually runs `axiom test`/`axiom push` in CI or the
// registry's build pipeline. Rather than depend on external flag
// configuration we do not control, the libxml2-wasm-dependent work runs in
// a genuine child Node process (spawned fresh, never vm-sandboxed), which
// works identically under Jest, `axiom dev`, and a deployed pod.
const WORKER_SCRIPT = `
const dynamicImport = new Function('specifier', 'return import(specifier)');
let chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', async () => {
  const respond = (obj) => { process.stdout.write(JSON.stringify(obj)); };
  let xsdDoc, xmlDoc, validator;
  try {
    const { xml, xsd, libPath } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const lib = await dynamicImport(libPath);
    const { XmlDocument, XsdValidator, XmlLibError, ParseOption } = lib;
    const parseOpts = { option: ParseOption.XML_PARSE_NO_XXE | ParseOption.XML_PARSE_NONET };
    try {
      try {
        xsdDoc = XmlDocument.fromString(xsd, parseOpts);
      } catch (e) {
        return respond({ error: { code: 'INVALID_XSD', message: String((e && e.message) || e) } });
      }
      try {
        validator = XsdValidator.fromDoc(xsdDoc);
      } catch (e) {
        return respond({ error: { code: 'INVALID_XSD', message: String((e && e.message) || e) } });
      }
      try {
        xmlDoc = XmlDocument.fromString(xml, parseOpts);
      } catch (e) {
        return respond({ error: { code: 'INVALID_XML', message: String((e && e.message) || e) } });
      }
      try {
        validator.validate(xmlDoc);
        return respond({ valid: true, violations: [] });
      } catch (e) {
        if (e instanceof XmlLibError && e.details && e.details.length > 0) {
          return respond({
            valid: false,
            violations: e.details.map((d) => ({ message: d.message, line: d.line || 0, column: d.col || 0 })),
          });
        }
        return respond({ error: { code: 'INVALID_XML', message: String((e && e.message) || e) } });
      }
    } finally {
      if (validator) validator.dispose();
      if (xmlDoc) xmlDoc.dispose();
      if (xsdDoc) xsdDoc.dispose();
    }
  } catch (e) {
    respond({ error: { code: 'INVALID_XSD', message: String((e && e.message) || e) } });
  }
});
`;

const WORKER_TIMEOUT_MS = 15000;

interface WorkerViolation {
  message: string;
  line: number;
  column: number;
}
interface WorkerResult {
  valid?: boolean;
  violations?: WorkerViolation[];
  error?: { code: string; message: string };
}

function runXsdWorker(xml: string, xsd: string): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', WORKER_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new NodeError('INVALID_XSD', `XSD validation did not complete within ${WORKER_TIMEOUT_MS}ms`));
    }, WORKER_TIMEOUT_MS);

    child.stdout.on('data', (c) => {
      stdout += c;
    });
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new NodeError('INVALID_XSD', `xsd validation worker failed to start: ${e.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        reject(new NodeError('INVALID_XSD', `xsd validation worker produced no output (exit ${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new NodeError('INVALID_XSD', `xsd validation worker returned malformed output: ${stdout.slice(0, 500)}`));
      }
    });

    child.stdin.write(JSON.stringify({ xml, xsd, libPath: LIBXML2_WASM_ENTRY }));
    child.stdin.end();
  });
}

/**
 * Validate an XML document against a caller-supplied XSD schema and report
 * every conformance violation (message plus line/column when the validator
 * provides one) rather than only the first.
 *
 * libxml2-wasm is parsed with XML_PARSE_NO_XXE | XML_PARSE_NONET set on both
 * the schema and the document (belt-and-suspenders: libxml2 2.15+ removed
 * its built-in HTTP/FTP client entirely, verified live — a schema
 * xsd:import-ing a non-routable address resolves in ~5ms with no network
 * attempt even without these flags) and XML_PARSE_HUGE is never set, which
 * keeps libxml2's own default 256-level element-nesting cap in force.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function validateXsd(ax: AxiomContext, input: ValidateXsdRequest): Promise<ValidateXsdResult> {
  const result = new ValidateXsdResult();
  try {
    const xmlText = input.getXml();
    const xsdText = input.getXsd();
    if (xmlText.trim().length === 0) {
      throw new NodeError('INVALID_XML', 'xml is empty');
    }
    if (byteLength(xmlText) > MAX_XML_BYTES) {
      throw new NodeError('TOO_LARGE', `xml exceeds ${MAX_XML_BYTES} bytes`);
    }
    if (xsdText.trim().length === 0) {
      throw new NodeError('INVALID_XSD', 'xsd is empty');
    }
    if (byteLength(xsdText) > MAX_XSD_BYTES) {
      throw new NodeError('TOO_LARGE', `xsd exceeds ${MAX_XSD_BYTES} bytes`);
    }

    const workerResult = await runXsdWorker(xmlText, xsdText);
    if (workerResult.error) {
      throw new NodeError(workerResult.error.code, workerResult.error.message);
    }
    result.setValid(!!workerResult.valid);
    result.setViolationsList(
      (workerResult.violations || []).map((wv) => {
        const v = new ValidationViolation();
        v.setMessage(wv.message);
        v.setLine(wv.line);
        v.setColumn(wv.column);
        return v;
      }),
    );
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XSD'));
  }
  return result;
}
