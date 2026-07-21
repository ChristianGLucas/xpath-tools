import { TransformXsltRequest } from '../gen/messages_pb';
import { transformXslt } from './transform_xslt';
import { testContext } from './test_helpers';

function req(xml: string, xslt: string, params: Record<string, string> = {}): TransformXsltRequest {
  const r = new TransformXsltRequest();
  r.setXml(xml);
  r.setXslt(xslt);
  const m = r.getParamsMap();
  for (const [k, v] of Object.entries(params)) m.set(k, v);
  return r;
}

const XML = '<root><item>A</item><item>B</item></root>';

describe('TransformXslt', () => {
  it('transforms with xsl:for-each + xsl:value-of select="self::node()", text output method, and NO xml declaration', async () => {
    // NOTE: uses self::node(), not the bare "." shorthand — see the
    // "known xsltjs quirk" test below for why.
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/">
  <xsl:for-each select="//item"><xsl:value-of select="self::node()"/>,</xsl:for-each>
</xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getError()).toBeUndefined();
    expect(result.getOutputMethod()).toBe('text');
    // The library itself prepends an XML declaration unconditionally whenever
    // <xsl:output> is present, regardless of method — normalizeOutput strips
    // it back off for a non-xml method. This assertion is the regression
    // test for that specific, hand-verified library quirk.
    expect(result.getOutput()).not.toContain('<?xml');
    expect(result.getOutput().trim()).toBe('A,B,');
  });

  it('extracts text with xsl:value-of select="text()" as an equally-working alternative to self::node()', async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/"><xsl:for-each select="//item"><xsl:value-of select="text()"/>,</xsl:for-each></xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getOutput().trim()).toBe('A,B,');
  });

  it('documents a known xsltjs 0.0.75 quirk: xsl:value-of select="." (the bare self shorthand) ' +
    'returns the escaped node serialization instead of the string-value — self::node() (tested above) is ' +
    'the correct, working equivalent. This test pins the CURRENT engine behavior so an upstream fix or ' +
    'regression is caught, not silently missed.', async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/"><xsl:for-each select="//item"><xsl:value-of select="."/>,</xsl:for-each></xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getError()).toBeUndefined();
    // This is the WRONG output ("A" is expected) — it is asserted here
    // precisely because it is the engine's actual, verified behavior today.
    expect(result.getOutput()).toContain('&lt;item&gt;A&lt;/item&gt;');
  });

  it('honors a caller-supplied xsl:param override', async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:param name="greeting" select="'default'"/>
<xsl:template match="/"><xsl:value-of select="$greeting"/></xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt, { greeting: 'Hi there' }));
    expect(result.getOutput().trim()).toBe('Hi there');
  });

  it('produces xml output WITH a declaration when method is xml (the default)', async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/"><out><xsl:copy-of select="//item[1]"/></out></xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getError()).toBeUndefined();
    expect(result.getOutputMethod()).toBe('xml');
    expect(result.getOutput()).toMatch(/^<\?xml/);
    expect(result.getOutput()).toContain('<item>A</item>');
  });

  it('rejects xsl:apply-templates immediately instead of hanging (confirmed: the engine never resolves/rejects on it)', async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/"><xsl:apply-templates select="//item"/></xsl:template>
<xsl:template match="item"><xsl:value-of select="."/></xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XSLT');
    expect(result.getError()!.getMessage()).toContain('apply-templates');
  }, 10000);

  it('blocks a stylesheet document() call instead of performing a network fetch (SSRF guard)', async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/"><xsl:value-of select="document('https://example.invalid/x.xml')"/></xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XSLT');
  }, 10000);

  it('reports INVALID_XSLT on a malformed (non-well-formed) stylesheet', async () => {
    const result = await transformXslt(testContext, req(XML, '<xsl:stylesheet><unclosed>'));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XSLT');
  });

  it('reports INVALID_XML on malformed source XML', async () => {
    const xslt = `<?xml version="1.0"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><out/></xsl:template></xsl:stylesheet>`;
    const result = await transformXslt(testContext, req('<root><a>', xslt));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XML');
  });
});
