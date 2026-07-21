import { SelectFirstNodeRequest, SelectFirstNodeResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathNodeSet, serializeNode, mapToObject, buildErrorMsg } from './lib';

/**
 * Select only the first node (in document order) a node-set XPath
 * expression matches, serialized to an XML fragment — the common "give me
 * just one" case without paying to serialize every match.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function selectFirstNode(ax: AxiomContext, input: SelectFirstNodeRequest): SelectFirstNodeResult {
  const result = new SelectFirstNodeResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const nodes = evalXPathNodeSet(doc, input.getXpath(), namespaces);
    if (nodes.length === 0) {
      result.setFound(false);
      result.setNode('');
    } else {
      result.setFound(true);
      result.setNode(serializeNode(nodes[0]));
    }
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
