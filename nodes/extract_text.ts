import { ExtractTextRequest, ExtractTextResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathNodeSet, stringValueOfNode, mapToObject, buildErrorMsg } from './lib';

/**
 * Extract the text content of every node a node-set XPath expression
 * matches, one string per matched node in document order — an element's
 * concatenated descendant text, an attribute's value, or a text node's own
 * text, applying XPath string-value conversion per-node rather than to the
 * whole result set.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function extractText(ax: AxiomContext, input: ExtractTextRequest): ExtractTextResult {
  const result = new ExtractTextResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const nodes = evalXPathNodeSet(doc, input.getXpath(), namespaces);
    const texts = nodes.map(stringValueOfNode);
    result.setTextsList(texts);
    result.setCount(texts.length);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
