import { ExtractAttributeRequest } from '../gen/messages_pb';
import { extractAttribute } from './extract_attribute';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): ExtractAttributeRequest {
  const r = new ExtractAttributeRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('ExtractAttribute', () => {
  it('extracts every matched attribute value in document order', () => {
    const result = extractAttribute(testContext, req(CATALOG_XML, '//b:book/@id', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getValuesList()).toEqual(['bk101', 'bk102']);
    expect(result.getCount()).toBe(2);
  });

  it('extracts a real-world link-harvesting pattern (//a/@href)', () => {
    const xml = '<doc><a href="https://a.example/1">x</a><a href="https://a.example/2">y</a></doc>';
    const result = extractAttribute(testContext, req(xml, '//a/@href'));
    expect(result.getValuesList()).toEqual(['https://a.example/1', 'https://a.example/2']);
  });

  it('reports INVALID_XPATH when the expression matches elements, not attributes', () => {
    const result = extractAttribute(testContext, req(CATALOG_XML, '//b:book', CATALOG_NS));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XPATH');
  });

  it('returns an empty list, not an error, when nothing matches', () => {
    const result = extractAttribute(testContext, req(CATALOG_XML, '//b:book/@nonexistent', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getValuesList()).toEqual([]);
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = extractAttribute(testContext, req('<a', '//a/@x'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
