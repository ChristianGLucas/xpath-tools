import { ExtractTextRequest } from '../gen/messages_pb';
import { extractText } from './extract_text';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): ExtractTextRequest {
  const r = new ExtractTextRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('ExtractText', () => {
  it('extracts one text per matched node, in document order — not just the first (contrast EvaluateXPathString)', () => {
    const result = extractText(testContext, req(CATALOG_XML, '//b:title', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getTextsList()).toEqual(['Dune', 'Foundation']);
    expect(result.getCount()).toBe(2);
  });

  it('extracts an attribute value via string-value conversion', () => {
    const result = extractText(testContext, req(CATALOG_XML, '//b:book/@id', CATALOG_NS));
    expect(result.getTextsList()).toEqual(['bk101', 'bk102']);
  });

  it('concatenates descendant text for an element with mixed structure', () => {
    const xml = '<r><a>He said <b>hello</b> to me</a></r>';
    const result = extractText(testContext, req(xml, '//a'));
    expect(result.getTextsList()).toEqual(['He said hello to me']);
  });

  it('returns an empty list, not an error, when nothing matches', () => {
    const result = extractText(testContext, req(CATALOG_XML, '//b:nonexistent', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getTextsList()).toEqual([]);
    expect(result.getCount()).toBe(0);
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = extractText(testContext, req('<a', '//a'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
