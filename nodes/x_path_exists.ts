import { XPathExistsRequest, XPathExistsResult } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, evalXPathNodeSet, mapToObject, buildErrorMsg } from './lib';

/**
 * Check whether a node-set XPath expression matches at least one node in
 * the document — a cheap existence check.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function xPathExists(ax: AxiomContext, input: XPathExistsRequest): XPathExistsResult {
  const result = new XPathExistsResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const namespaces = mapToObject(input.getNamespacesMap());
    const nodes = evalXPathNodeSet(doc, input.getXpath(), namespaces);
    result.setExists(nodes.length > 0);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
