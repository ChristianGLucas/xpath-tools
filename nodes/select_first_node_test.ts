import { SelectFirstNodeRequest } from '../gen/messages_pb';
import { selectFirstNode } from './select_first_node';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): SelectFirstNodeRequest {
  const r = new SelectFirstNodeRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('SelectFirstNode', () => {
  it('returns only the first matched node, in document order', () => {
    const result = selectFirstNode(testContext, req(CATALOG_XML, '//b:book', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getNode()).toContain('id="bk101"');
    expect(result.getNode()).not.toContain('bk102');
  });

  it('sets found=false (not an error) when the expression is valid but matches nothing', () => {
    const result = selectFirstNode(testContext, req(CATALOG_XML, '//b:nonexistent', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
    expect(result.getNode()).toBe('');
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = selectFirstNode(testContext, req('<a', '//a'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
