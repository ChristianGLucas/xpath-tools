import { CountXPathRequest, CountXPathResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathNodeSet, mapToObject, buildErrorMsg } from './lib';

/**
 * Count how many nodes a node-set XPath expression matches (e.g.
 * "//item[@active='true']"), without serializing the matched nodes
 * themselves — cheaper than EvaluateXPathNodes when only the count is
 * needed.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function countXPath(ax: AxiomContext, input: CountXPathRequest): CountXPathResult {
  const result = new CountXPathResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const nodes = evalXPathNodeSet(doc, input.getXpath(), namespaces);
    result.setCount(nodes.length);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
