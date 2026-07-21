import { ValidateXsdRequest } from '../gen/messages_pb';
import { validateXsd } from './validate_xsd';
import { testContext } from './test_helpers';

function req(xml: string, xsd: string): ValidateXsdRequest {
  const r = new ValidateXsdRequest();
  r.setXml(xml);
  r.setXsd(xsd);
  return r;
}

const PERSON_XSD = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="name" type="xs:string"/>
        <xs:element name="age" type="xs:integer"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

describe('ValidateXsd', () => {
  it('reports valid=true and no violations for a conforming document', async () => {
    const result = await validateXsd(testContext, req('<person><name>Alice</name><age>30</age></person>', PERSON_XSD));
    expect(result.getError()).toBeUndefined();
    expect(result.getValid()).toBe(true);
    expect(result.getViolationsList()).toEqual([]);
  });

  it('reports every violation, not just the first, for a non-conforming document', async () => {
    const bad = '<person><name>Alice</name><age>not-a-number</age><extra>x</extra></person>';
    const result = await validateXsd(testContext, req(bad, PERSON_XSD));
    expect(result.getError()).toBeUndefined();
    expect(result.getValid()).toBe(false);
    expect(result.getViolationsList().length).toBeGreaterThanOrEqual(2);
    const messages = result.getViolationsList().map((v) => v.getMessage());
    expect(messages.some((m) => m.includes('age'))).toBe(true);
    expect(messages.some((m) => m.includes('extra'))).toBe(true);
  });

  it('reports INVALID_XSD for a malformed schema (distinct from a validation failure)', async () => {
    const result = await validateXsd(testContext, req('<person><name>Alice</name><age>1</age></person>', '<xs:schema><<broken'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XSD');
  });

  it('reports INVALID_XML for malformed source XML against a valid schema', async () => {
    const result = await validateXsd(testContext, req('<person><name>Alice</name', PERSON_XSD));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });

  it('does not resolve a remote xsd:import — schema compiles fast, no network hang (SSRF/XXE guard)', async () => {
    const schemaWithRemoteImport = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="urn:ext">
  <xs:import namespace="urn:ext" schemaLocation="http://169.254.169.254/latest/meta-data/"/>
  <xs:element name="root" type="xs:string"/>
</xs:schema>`;
    const start = Date.now();
    const result = await validateXsd(testContext, req('<root>hi</root>', schemaWithRemoteImport));
    const elapsedMs = Date.now() - start;
    // A real network attempt to a non-routable address would take seconds;
    // resolving well under a second is the evidence no fetch was attempted.
    expect(elapsedMs).toBeLessThan(2000);
    expect(result.getValid()).toBe(true);
  });
});
