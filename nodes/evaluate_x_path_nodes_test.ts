import { EvaluateXPathNodesRequest } from '../gen/messages_pb';
import { evaluateXPathNodes } from './evaluate_x_path_nodes';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): EvaluateXPathNodesRequest {
  const r = new EvaluateXPathNodesRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('EvaluateXPathNodes', () => {
  it('returns every matched node serialized, in document order (namespaced query)', () => {
    const result = evaluateXPathNodes(testContext, req(CATALOG_XML, '//b:book', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getCount()).toBe(2);
    expect(result.getNodesList()).toHaveLength(2);
    expect(result.getNodesList()[0]).toContain('id="bk101"');
    expect(result.getNodesList()[0]).toContain('<b:title>Dune</b:title>');
    expect(result.getNodesList()[1]).toContain('id="bk102"');
  });

  it('matches nothing without error when the expression is valid but empty', () => {
    const result = evaluateXPathNodes(testContext, req(CATALOG_XML, '//b:nonexistent', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getCount()).toBe(0);
    expect(result.getNodesList()).toEqual([]);
  });

  it('serializes an attribute node as name="value"', () => {
    const result = evaluateXPathNodes(testContext, req(CATALOG_XML, '//b:book/@id', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getNodesList()).toEqual(['id="bk101"', 'id="bk102"']);
  });

  it('is deterministic across repeated invocations', () => {
    const r1 = evaluateXPathNodes(testContext, req(CATALOG_XML, '//b:book', CATALOG_NS));
    const r2 = evaluateXPathNodes(testContext, req(CATALOG_XML, '//b:book', CATALOG_NS));
    expect(r1.getNodesList()).toEqual(r2.getNodesList());
  });

  it('reports INVALID_XML on malformed XML instead of crashing', () => {
    const result = evaluateXPathNodes(testContext, req('<root><a>unclosed</root>', '//a'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
    expect(result.getNodesList()).toEqual([]);
  });

  it('reports INVALID_XPATH on a syntactically invalid expression instead of crashing', () => {
    const result = evaluateXPathNodes(testContext, req(CATALOG_XML, '//['));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XPATH');
  });

  it('reports INVALID_XPATH when an XPath prefix has no matching namespaces entry', () => {
    const result = evaluateXPathNodes(testContext, req(CATALOG_XML, '//b:book', {}));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XPATH');
  });

  it('does not resolve an XXE external entity — the reference is reported as an error, never expanded', () => {
    const xxe = '<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r><a>&x;</a></r>';
    const result = evaluateXPathNodes(testContext, req(xxe, '//a'));
    // Either it is rejected outright, or (if ever accepted) the entity must
    // never have been substituted with file content.
    if (result.getError()) {
      expect(result.getError()!.getCode()).toBe('INVALID_XML');
    } else {
      expect(result.getNodesList().join('')).not.toContain('root:');
    }
  });

  it('rejects XML over the 3 MB size bound as TOO_LARGE', () => {
    const big = '<r>' + 'a'.repeat(3 * 1024 * 1024 + 1) + '</r>';
    const result = evaluateXPathNodes(testContext, req(big, '//r'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('TOO_LARGE');
  });

  it('bounds pathological nesting depth instead of hanging', () => {
    const depth = 50000;
    const deep = '<a>'.repeat(depth) + 'leaf' + '</a>'.repeat(depth);
    const result = evaluateXPathNodes(testContext, req(deep, '//a'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('TOO_LARGE');
  }, 10000);
});
