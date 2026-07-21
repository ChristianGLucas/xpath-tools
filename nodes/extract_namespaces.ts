import { ExtractNamespacesRequest, ExtractNamespacesResult, NamespaceDeclaration } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { parseXmlDom, collectNamespaceDeclarations, buildErrorMsg } from './lib';

/**
 * Extract every distinct namespace declaration (xmlns / xmlns:prefix
 * attribute) found anywhere in an XML document, de-duplicated by (prefix,
 * uri) pair, in document order of first occurrence.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export function extractNamespaces(ax: AxiomContext, input: ExtractNamespacesRequest): ExtractNamespacesResult {
  const result = new ExtractNamespacesResult();
  try {
    const doc = parseXmlDom(input.getXml());
    const decls = collectNamespaceDeclarations(doc).map(({ prefix, uri }) => {
      const d = new NamespaceDeclaration();
      d.setPrefix(prefix);
      d.setUri(uri);
      return d;
    });
    result.setNamespacesList(decls);
  } catch (e) {
    result.setError(buildErrorMsg(e, 'INVALID_XML'));
  }
  return result;
}
