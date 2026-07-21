import { ExtractAttributeRequest, ExtractAttributeResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathNodeSet, isAttributeNode, mapToObject, buildErrorMsg, NodeError } from './lib';

/**
 * Extract the value of every attribute node a node-set XPath expression
 * matches, e.g. "//a/@href" to pull every link target in a document, one
 * value per matched attribute in document order.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function extractAttribute(ax: AxiomContext, input: ExtractAttributeRequest): ExtractAttributeResult {
  const result = new ExtractAttributeResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const nodes = evalXPathNodeSet(doc, input.getXpath(), namespaces);
    const values = nodes.map((node) => {
      if (!isAttributeNode(node)) {
        throw new NodeError('INVALID_XPATH', 'xpath matched a non-attribute node; use //el/@attr to select attributes');
      }
      return (node as { value: string }).value;
    });
    result.setValuesList(values);
    result.setCount(values.length);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
