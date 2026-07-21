import { EvaluateXPathStringRequest, EvaluateXPathStringResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPath, xpathResultToString, mapToObject, buildErrorMsg } from './lib';

/**
 * Evaluate an XPath 1.0 expression and return its result converted to a
 * string per the XPath string() rules (a node-set takes the string-value of
 * its first node in document order; number/boolean convert to their
 * canonical string form).
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function evaluateXPathString(ax: AxiomContext, input: EvaluateXPathStringRequest): EvaluateXPathStringResult {
  const result = new EvaluateXPathStringResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const value = evalXPath(doc, input.getXpath(), namespaces);
    result.setValue(xpathResultToString(value));
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
