import { ExtractNamespacesRequest } from '../gen/messages_pb';
import { extractNamespaces } from './extract_namespaces';
import { testContext, CATALOG_XML } from './test_helpers';

function req(xml: string): ExtractNamespacesRequest {
  const r = new ExtractNamespacesRequest();
  r.setXml(xml);
  return r;
}

describe('ExtractNamespaces', () => {
  it('extracts a single declared namespace', () => {
    const result = extractNamespaces(testContext, req(CATALOG_XML));
    expect(result.getError()).toBeUndefined();
    const decls = result.getNamespacesList().map((d) => ({ prefix: d.getPrefix(), uri: d.getUri() }));
    expect(decls).toEqual([{ prefix: 'b', uri: 'urn:example:book' }]);
  });

  it('extracts multiple declarations including a default (unprefixed) namespace, de-duplicated', () => {
    const xml = `<root xmlns="urn:default" xmlns:a="urn:a" xmlns:b="urn:b">
      <child xmlns:a="urn:a"><grand/></child>
    </root>`;
    const result = extractNamespaces(testContext, req(xml));
    const decls = result.getNamespacesList().map((d) => ({ prefix: d.getPrefix(), uri: d.getUri() }));
    expect(decls).toEqual([
      { prefix: '', uri: 'urn:default' },
      { prefix: 'a', uri: 'urn:a' },
      { prefix: 'b', uri: 'urn:b' },
    ]);
  });

  it('returns an empty list for a document with no namespace declarations', () => {
    const result = extractNamespaces(testContext, req('<root><a>1</a></root>'));
    expect(result.getError()).toBeUndefined();
    expect(result.getNamespacesList()).toEqual([]);
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = extractNamespaces(testContext, req('<root><a>'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
