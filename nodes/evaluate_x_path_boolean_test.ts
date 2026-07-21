import { EvaluateXPathBooleanRequest } from '../gen/messages_pb';
import { evaluateXPathBoolean } from './evaluate_x_path_boolean';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): EvaluateXPathBooleanRequest {
  const r = new EvaluateXPathBooleanRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('EvaluateXPathBoolean', () => {
  it('is true when a node-set expression matches at least one node', () => {
    const result = evaluateXPathBoolean(testContext, req(CATALOG_XML, '//b:book', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getValue()).toBe(true);
  });

  it('is false when a node-set expression matches nothing', () => {
    const result = evaluateXPathBoolean(testContext, req(CATALOG_XML, '//b:nonexistent', CATALOG_NS));
    expect(result.getValue()).toBe(false);
  });

  it('evaluates a value-comparison expression correctly for both branches', () => {
    const availableTrue = evaluateXPathBoolean(
      testContext,
      req(CATALOG_XML, "//b:book[1]/@available = 'true'", CATALOG_NS),
    );
    const availableFalse = evaluateXPathBoolean(
      testContext,
      req(CATALOG_XML, "//b:book[2]/@available = 'true'", CATALOG_NS),
    );
    expect(availableTrue.getValue()).toBe(true);
    expect(availableFalse.getValue()).toBe(false);
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = evaluateXPathBoolean(testContext, req('<a', 'boolean(//a)'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
