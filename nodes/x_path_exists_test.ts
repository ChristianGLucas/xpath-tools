import { XPathExistsRequest } from '../gen/messages_pb';
import { xPathExists } from './x_path_exists';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): XPathExistsRequest {
  const r = new XPathExistsRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('XPathExists', () => {
  it('is true when at least one node matches', () => {
    const result = xPathExists(testContext, req(CATALOG_XML, "//b:book[@available='false']", CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getExists()).toBe(true);
  });

  it('is false when nothing matches', () => {
    const result = xPathExists(testContext, req(CATALOG_XML, '//b:nonexistent', CATALOG_NS));
    expect(result.getExists()).toBe(false);
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = xPathExists(testContext, req('<a', '//a'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
