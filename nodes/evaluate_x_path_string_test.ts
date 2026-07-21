import { EvaluateXPathStringRequest } from '../gen/messages_pb';
import { evaluateXPathString } from './evaluate_x_path_string';
import { testContext, CATALOG_XML, CATALOG_NS } from './test_helpers';

function req(xml: string, xpathExpr: string, ns: Record<string, string> = {}): EvaluateXPathStringRequest {
  const r = new EvaluateXPathStringRequest();
  r.setXml(xml);
  r.setXpath(xpathExpr);
  const m = r.getNamespacesMap();
  for (const [k, v] of Object.entries(ns)) m.set(k, v);
  return r;
}

describe('EvaluateXPathString', () => {
  it('takes the string-value of the FIRST matched node in document order', () => {
    const result = evaluateXPathString(testContext, req(CATALOG_XML, '//b:title', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getValue()).toBe('Dune'); // first <b:title>, not Foundation
  });

  it('evaluates a concat() expression', () => {
    const result = evaluateXPathString(
      testContext,
      req(CATALOG_XML, "concat(//b:title[1], ' by ', //b:author[1])", CATALOG_NS),
    );
    expect(result.getValue()).toBe('Dune by Frank Herbert');
  });

  it('returns "" for a node-set expression that matches nothing (not an error)', () => {
    const result = evaluateXPathString(testContext, req(CATALOG_XML, '//b:nonexistent', CATALOG_NS));
    expect(result.getError()).toBeUndefined();
    expect(result.getValue()).toBe('');
  });

  it('converts a number result to its canonical string form', () => {
    const result = evaluateXPathString(testContext, req(CATALOG_XML, 'count(//b:book)', CATALOG_NS));
    expect(result.getValue()).toBe('2');
  });

  it('reports INVALID_XML on malformed XML', () => {
    const result = evaluateXPathString(testContext, req('<a>', 'string(//a)'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });

  it('reports INVALID_ARGUMENT on an empty xpath', () => {
    const result = evaluateXPathString(testContext, req(CATALOG_XML, ''));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_ARGUMENT');
  });
});
