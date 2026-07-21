import { TransformXsltRequest, TransformXsltResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, mapToObject, buildErrorMsg, MAX_XSLT_BYTES, NodeError } from './lib';
import { patchXsltNetworkFetch, rejectUnsafeDispatch, detectOutputSpec, normalizeOutput, withTimeout } from './xslt_lib';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { XSLT } = require('xsltjs');

// 5s: comfortably generous for any real transform (every legitimate
// transform in this package's own tests completes in well under 100ms) while
// keeping the worst-case wait bounded for a stylesheet that slips past
// rejectUnsafeDispatch's static check and still hangs the engine — see
// withTimeout's doc comment in xslt_lib.ts for why that residual case exists
// and cannot be closed by a static check alone.
const TRANSFORM_TIMEOUT_MS = 5000;

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
    patchXsltNetworkFetch();
    const xmlDoc = parseXmlDom(input.getXml());
    let xsltDoc: any;
    try {
      xsltDoc = parseXmlDom(input.getXslt(), { maxBytes: MAX_XSLT_BYTES, label: 'xslt' });
    } catch (e) {
      // parseXmlDom always reports INVALID_XML/TOO_LARGE — remap a well-
      // formedness failure specifically on the STYLESHEET argument to
      // INVALID_XSLT, which is what this node's Error.code vocabulary
      // documents for a malformed stylesheet.
      if (e instanceof NodeError && e.code === 'INVALID_XML') {
        throw new NodeError('INVALID_XSLT', e.message);
      }
      throw e;
    }

    rejectUnsafeDispatch(xsltDoc);
    const spec = detectOutputSpec(xsltDoc);
    const params = mapToObject(input.getParamsMap());

    let raw: string;
    try {
      raw = await withTimeout(XSLT.process(xmlDoc, xsltDoc, params, {}), TRANSFORM_TIMEOUT_MS);
    } catch (e) {
      if (e instanceof NodeError) throw e;
      throw new NodeError('INVALID_XSLT', e instanceof Error ? e.message : String(e));
    }

    result.setOutput(normalizeOutput(raw, spec));
    result.setOutputMethod(spec.method);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XSLT'));
  }
  return result;
}
