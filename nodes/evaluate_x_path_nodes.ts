import { EvaluateXPathNodesRequest, EvaluateXPathNodesResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathNodeSet, serializeNode, mapToObject, buildErrorMsg } from './lib';

/**
 * Evaluate an XPath 1.0 expression against an XML document and return every
 * matched node, serialized back to an XML fragment, in document order.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function evaluateXPathNodes(ax: AxiomContext, input: EvaluateXPathNodesRequest): EvaluateXPathNodesResult {
  const result = new EvaluateXPathNodesResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const nodes = evalXPathNodeSet(doc, input.getXpath(), namespaces);
    const serialized = nodes.map(serializeNode);
    result.setNodesList(serialized);
    result.setCount(serialized.length);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
