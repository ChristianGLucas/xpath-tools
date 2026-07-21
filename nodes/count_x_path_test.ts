import { CountXPathRequest } from '../gen/messages_pb';
import { countXPath } from './count_x_path';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): CountXPathRequest {
  const r = new CountXPathRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('CountXPath', () => {
  it('counts matched nodes', () => {
    const result = countXPath(testContext, req(CATALOG_XML, '//b:book', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getCount()).toBe(2);
  });

  it('counts with a predicate', () => {
    const result = countXPath(testContext, req(CATALOG_XML, "//b:book[@available='true']", CATALOG_NS));
    expect(result.getCount()).toBe(1);
  });

  it('is 0, not an error, when nothing matches', () => {
    const result = countXPath(testContext, req(CATALOG_XML, '//b:nonexistent', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getCount()).toBe(0);
  });

  it('reports INVALID_XPATH when the expression is not a node-set', () => {
    const result = countXPath(testContext, req(CATALOG_XML, 'count(//b:book)', CATALOG_NS));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XPATH');
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = countXPath(testContext, req('<a', '//a'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
