import { EvaluateXPathNumberRequest, EvaluateXPathNumberResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathAsNumber, mapToObject, buildErrorMsg } from './lib';

/**
 * Evaluate an XPath 1.0 expression and return its result converted to a
 * number per the XPath number() rules, e.g. "count(//item)",
 * "//price + //tax", or "sum(//item/@qty)".
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function evaluateXPathNumber(ax: AxiomContext, input: EvaluateXPathNumberRequest): EvaluateXPathNumberResult {
  const result = new EvaluateXPathNumberResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const { value, isNaN: nan } = evalXPathAsNumber(doc, input.getXpath(), namespaces);
    result.setValue(value);
    result.setIsNan(nan);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
