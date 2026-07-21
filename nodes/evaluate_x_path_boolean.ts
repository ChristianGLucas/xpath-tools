import { EvaluateXPathBooleanRequest, EvaluateXPathBooleanResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathAsBoolean, mapToObject, buildErrorMsg } from './lib';

/**
 * Evaluate an XPath 1.0 expression and return its result converted to a
 * boolean per the XPath boolean() rules, e.g. "//status = 'active'" or
 * "boolean(//error)".
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function evaluateXPathBoolean(ax: AxiomContext, input: EvaluateXPathBooleanRequest): EvaluateXPathBooleanResult {
  const result = new EvaluateXPathBooleanResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    result.setValue(evalXPathAsBoolean(doc, input.getXpath(), namespaces));
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
