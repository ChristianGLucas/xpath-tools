// Shared test fixture — not a test file itself (jest only collects *_test.ts).
import { AxiomContext, AxiomLogger, AxiomSecrets, AxiomReflection, AxiomMutation } from '../gen/axiomContext';

const testReflection: AxiomReflection = {
  flow: {
    nodes: [],
    edges: [],
    loopEdges: [],
    position: { currentInstance: 0, depth: 0, loopIterations: {}, subflowStackGraphIds: [] },
    graphId: '',
  },
};

const testMutation: AxiomMutation = {
  flow: {
    addNode: (_packageName: string, _packageVersion: string) => 0,
    addEdge: (_srcInstance: number, _dstInstance: number) => {},
  },
};

export const testContext: AxiomContext = {
  log: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } satisfies AxiomLogger,
  secrets: {
    get: (_name: string): [string, boolean] => ['', false],
  } satisfies AxiomSecrets,
  executionId: 'test-execution-id',
  flowId: 'test-flow-id',
  tenantId: 'test-tenant-id',
  reflection: testReflection,
  mutation: testMutation,
};

// A small, realistic fixture document reused across node tests: a book
// catalog with a namespaced sub-tree, an attribute, mixed text content, and
// more than one matching element (so count/first-vs-all assertions are
// meaningful, not vacuously true on a single-element document).
export const CATALOG_XML = `<?xml version="1.0"?>
<catalog xmlns:b="urn:example:book">
  <b:book id="bk101" available="true">
    <b:title>Dune</b:title>
    <b:author>Frank Herbert</b:author>
    <b:price>12.99</b:price>
  </b:book>
  <b:book id="bk102" available="false">
    <b:title>Foundation</b:title>
    <b:author>Isaac Asimov</b:author>
    <b:price>9.99</b:price>
  </b:book>
</catalog>`;

export const CATALOG_NS = { b: 'urn:example:book' };
