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

  it('rejects a stylesheet with NO top-level <xsl:template match="/"> instead of hanging — the engine\'s ' +
    'own implicit top-level dispatch hits the identical hang as xsl:apply-templates even with zero ' +
    'occurrences of that literal token in the source (found by independent review, reproduced directly)',
  async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="item"><xsl:value-of select="text()"/>,</xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XSLT');
    expect(result.getError()!.getMessage()).toContain('match="/"');
  }, 10000);

  it('rejects a match="/" pattern that is whitespace-padded or "|"-combined with another alternative — ' +
    'the engine does not treat either as a root template despite it being spec-legal XSLT (found by a ' +
    'second independent review pass, reproduced directly: both hang for the full engine timeout)',
  async () => {
    const padded = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match=" / "><xsl:for-each select="//item"><xsl:value-of select="text()"/>,</xsl:for-each></xsl:template>
</xsl:stylesheet>`;
    const r1 = await transformXslt(testContext, req(XML, padded));
    expect(r1.getError()).toBeDefined();
    expect(r1.getError()!.getCode()).toBe('INVALID_XSLT');

    const combined = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/|foo"><xsl:for-each select="//item"><xsl:value-of select="text()"/>,</xsl:for-each></xsl:template>
</xsl:stylesheet>`;
    const r2 = await transformXslt(testContext, req(XML, combined));
    expect(r2.getError()).toBeDefined();
    expect(r2.getError()!.getCode()).toBe('INVALID_XSLT');
  });

  it('rejects a stylesheet binding the XSL namespace to a non-"xsl" prefix (or a default/unprefixed ' +
    'binding) — spec-legal XSLT, but the engine\'s dispatch hangs on it regardless of namespace-URI ' +
    'correctness (found by a second independent review pass, reproduced directly)', async () => {
    const customPrefix = `<?xml version="1.0"?>
<xslt:stylesheet version="1.0" xmlns:xslt="http://www.w3.org/1999/XSL/Transform">
<xslt:output method="text"/>
<xslt:template match="/"><xslt:for-each select="//item"><xslt:value-of select="text()"/>,</xslt:for-each></xslt:template>
</xslt:stylesheet>`;
    const r1 = await transformXslt(testContext, req(XML, customPrefix));
    expect(r1.getError()).toBeDefined();
    expect(r1.getError()!.getCode()).toBe('INVALID_XSLT');

    const defaultNs = `<?xml version="1.0"?>
<stylesheet version="1.0" xmlns="http://www.w3.org/1999/XSL/Transform">
<output method="text"/>
<template match="/"><for-each select="//item"><value-of select="text()"/>,</for-each></template>
</stylesheet>`;
    const r2 = await transformXslt(testContext, req(XML, defaultNs));
    expect(r2.getError()).toBeDefined();
    expect(r2.getError()!.getCode()).toBe('INVALID_XSLT');
  });

  it('never hangs the caller on a stylesheet that slips past the static check (an exact, literal ' +
    'match="/" template whose body produces no output — confirmed directly to still hang the underlying ' +
    'engine\'s own promise, indistinguishable from a safe empty-output template without running it) — ' +
    'the worker child process exits on its own once its event loop drains (nothing else keeps an ' +
    'unsettled await alive), which this node reports as a clean INVALID_XSLT rather than waiting out ' +
    'the full timeout or hanging',
  async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/"></xsl:template>
</xsl:stylesheet>`;
    const start = Date.now();
    const result = await transformXslt(testContext, req(XML, xslt));
    const elapsedMs = Date.now() - start;
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XSLT');
    expect(result.getError()!.getMessage()).toContain('did not complete');
    // Bounded well under the ~5s worst-case timeout either way — never an
    // indefinite hang, and this particular trigger resolves fast.
    expect(elapsedMs).toBeLessThan(8000);
  }, 10000);

  it('bounds a CPU-BOUND hang (not just an async one) to the timeout — a THIRD independent review pass ' +
    'found that an entirely ordinary triple-nested xsl:for-each over a modest document makes the engine ' +
    'spin the CPU synchronously for minutes, which starves the event loop badly enough that an in-thread ' +
    '"Promise.race" timeout literally cannot fire (the callback never gets a turn); only running the ' +
    'transform in a genuine child process and SIGKILLing it on timeout can preempt this — this test proves ' +
    'that mechanism actually works, not just the (insufficient) in-thread approach it replaced',
  async () => {
    const n = 100;
    let items = '';
    for (let i = 0; i < n; i++) items += `<item>${i}</item>`;
    const bigXml = `<root>${items}</root>`;
    // Triple-nested for-each, each re-selecting the full item list by
    // absolute path: O(n^3) iterations — ~1,000,000 at n=100, which the
    // engine takes well over 5s (measured directly: ~80 items alone already
    // takes ~5.3s) to even begin approaching, guaranteeing the 5s timeout
    // fires while it is still genuinely working, not coincidentally close
    // to finishing.
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/">
  <xsl:for-each select="root/item">
    <xsl:for-each select="/root/item">
      <xsl:for-each select="/root/item"><x/></xsl:for-each>
    </xsl:for-each>
  </xsl:for-each>
</xsl:template>
</xsl:stylesheet>`;
    const start = Date.now();
    const result = await transformXslt(testContext, req(bigXml, xslt));
    const elapsedMs = Date.now() - start;
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INVALID_XSLT');
    expect(result.getError()!.getMessage()).toContain('did not complete within');
    // Bounded near the configured timeout (plus child-process spawn/kill
    // overhead) — not the 470+ SECONDS the third review pass observed with
    // the in-thread-timeout approach this replaced.
    expect(elapsedMs).toBeGreaterThan(4000);
    expect(elapsedMs).toBeLessThan(9000);
  }, 15000);

  it('accepts a stylesheet with an explicit root template even when it ALSO declares an unrelated, ' +
    'never-triggered template for another element (a benign template is not mistaken for a dispatch risk)',
  async () => {
    const xslt = `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="text"/>
<xsl:template match="/"><xsl:for-each select="//item"><xsl:value-of select="text()"/>,</xsl:for-each></xsl:template>
<xsl:template match="item">UNUSED</xsl:template>
</xsl:stylesheet>`;
    const result = await transformXslt(testContext, req(XML, xslt));
    expect(result.getError()).toBeUndefined();
    expect(result.getOutput().trim()).toBe('A,B,');
  });

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
