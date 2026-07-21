import { EvaluateXPathNumberRequest } from '../gen/messages_pb';
import { evaluateXPathNumber } from './evaluate_x_path_number';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): EvaluateXPathNumberRequest {
  const r = new EvaluateXPathNumberRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('EvaluateXPathNumber', () => {
  it('evaluates count()', () => {
    const result = evaluateXPathNumber(testContext, req(CATALOG_XML, 'count(//b:book)', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getValue()).toBe(2);
    expect(result.getIsNan()).toBe(false);
  });

  it('evaluates a sum() over matched values', () => {
    const result = evaluateXPathNumber(testContext, req(CATALOG_XML, 'sum(//b:price)', CATALOG_NS));
    expect(result.getValue()).toBeCloseTo(12.99 + 9.99, 2);
  });

  it('evaluates arithmetic between two node-set values', () => {
    const result = evaluateXPathNumber(
      testContext,
      req(CATALOG_XML, '//b:book[1]/b:price - //b:book[2]/b:price', CATALOG_NS),
    );
    expect(result.getValue()).toBeCloseTo(3.0, 2);
  });

  it('sets is_nan for a non-numeric string-value conversion', () => {
    const result = evaluateXPathNumber(testContext, req(CATALOG_XML, 'number(//b:author[1])', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getIsNan()).toBe(true);
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = evaluateXPathNumber(testContext, req('<a', 'count(//a)'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
