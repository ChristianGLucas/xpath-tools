# xpath-tools

Composable [Axiom](https://axiomide.com) nodes for deterministic **XPath 1.0 querying**,
**XSLT 1.0 transformation**, and **XSD schema validation** of XML documents.

Built for the Axiom marketplace under the `christiangeorgelucas` handle. Distinct
from `dataformat-tools` (XML↔JSON conversion, well-formedness validation,
pretty-print — no XPath/XSLT/XSD) and from `json-query-tools` (JSON, not XML).

## Use it from your agent or app

Every node in this package is a **live, auto-scaling API endpoint** on the
[Axiom](https://axiomide.com) marketplace — call it from an AI agent or your own
code, with nothing to self-host.

**📦 See it on the marketplace:**
https://dev.axiomide.com/marketplace/christiangeorgelucas/xpath-tools@0.1.0

**Hook it up to an AI agent (MCP).** Add Axiom's hosted MCP server to any MCP
client and every node becomes a typed tool your agent can call — search the
catalog, inspect a schema, and invoke it directly.

```bash
# Claude Code
claude mcp add --transport http axiom https://api.axiomide.com/mcp \
  --header "Authorization: Bearer $AXIOM_API_KEY"
```

Claude Desktop, Cursor, or any config-based client:

```json
{
  "mcpServers": {
    "axiom": {
      "type": "http",
      "url": "https://api.axiomide.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_AXIOM_API_KEY" }
    }
  }
}
```

**Call it from the CLI.**

```bash
axiom invoke christiangeorgelucas/xpath-tools/EvaluateXPathNodes --input '{ ... }'
```

**Call it over HTTP.**

```bash
curl -X POST https://api.axiomide.com/invocations/v1/nodes/christiangeorgelucas/xpath-tools/0.1.0/EvaluateXPathNodes \
  -H "Authorization: Bearer $AXIOM_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{ ... }'
```

> Input/output schema for each node is on the marketplace page above, or via
> `axiom inspect node christiangeorgelucas/xpath-tools/EvaluateXPathNodes`.

### Get started free

Install the CLI:

```bash
# macOS / Linux — Homebrew
brew install axiomide/tap/axiom

# macOS / Linux — install script
curl -fsSL https://raw.githubusercontent.com/AxiomIDE/axiom-releases/main/install.sh | sh
```

**Windows:** download the `windows/amd64` `.zip` from the
[releases page](https://github.com/AxiomIDE/axiom-releases/releases), unzip it,
and put `axiom.exe` on your `PATH`.

Then `axiom version` to verify, `axiom login` (GitHub or Google) to authenticate,
and create an API key under **Console → API Keys**. Docs and sign-up at
**[axiomide.com](https://axiomide.com)**.

## What it wraps

| Capability | Library | License |
|---|---|---|
| XPath 1.0 evaluation | [`xpath`](https://www.npmjs.com/package/xpath) (goto100/xpath) | MIT |
| XML DOM parsing | [`@xmldom/xmldom`](https://www.npmjs.com/package/@xmldom/xmldom) | MIT |
| XSLT 1.0 transforms | [`xsltjs`](https://www.npmjs.com/package/xsltjs) (Xcential) | MIT |
| XSD schema validation | [`libxml2-wasm`](https://www.npmjs.com/package/libxml2-wasm) (WASM build of libxml2) | MIT |

All four are pure-JS or WASM — no native toolchain required to build or deploy.

## Nodes

- **EvaluateXPathNodes** — matched nodes as serialized XML fragments
- **EvaluateXPathString** / **EvaluateXPathNumber** / **EvaluateXPathBoolean** — typed XPath evaluation
- **CountXPath** — count matched nodes
- **ExtractText** — text content of every matched node
- **ExtractAttribute** — attribute values via XPath
- **TransformXslt** — XSLT 1.0 transformation with caller-supplied stylesheet + params
- **ValidateXsd** — XSD schema validation with per-violation line/column detail
- **ExtractNamespaces** — every namespace declaration in a document
- **SelectFirstNode** — first XPath match only
- **XPathExists** — existence check

Every node accepts an optional `namespaces` prefix→URI map for namespace-qualified
queries. See `axiom.yaml` for full per-node documentation.

## Security posture

- DTD loading and external-entity resolution are **unconditionally disabled** for
  every node — no XXE, no billion-laughs, no remote `document()`/import/include
  fetch, verified by direct inspection and live testing (not just library claims).
- Input size, XPath expression length, namespace-map size, and XML nesting depth
  are all bounded.
- The underlying XSLT engine (`xsltjs`, a self-described work-in-progress) can
  hang indefinitely in its template-dispatch machinery. Two rounds of direct,
  hands-on testing (not assumed) found this reachable more ways than any one
  static rule can fully enumerate — explicit `xsl:apply-templates`; a missing
  literal `<xsl:template match="/">`; the XSL namespace bound to a prefix
  other than the exact literal `xsl`; even, in one confirmed case, an exact
  `match="/"` template whose body simply produces no output (indistinguishable
  from a safe empty-output template without actually running it). `TransformXslt`
  statically rejects every mechanically-detectable trigger immediately, AND
  wraps every transform in a ~5s wall-clock timeout as the real backstop — so
  a construct that slips past the static check still fails cleanly with a
  structured error instead of hanging the caller. See `axiom.yaml`'s
  `TransformXslt` description for the exact, current list of what's statically
  rejected.
- Malformed XML/XPath/XSLT/XSD always returns a structured error, never a crash.

## Known engine limitations (tested, not guessed)

- `TransformXslt` statically rejects: `xsl:apply-templates` anywhere; no
  top-level `<xsl:template match="/">` with that exact literal match value
  (whitespace or a `|`-combined pattern does not count); and the XSL
  namespace bound to any prefix other than the exact literal `xsl`. Use
  `xsl:for-each` + `xsl:call-template` instead of apply-templates, neither of
  which triggers template dispatch. A ~5s timeout bounds anything that slips
  past this check and still hangs the engine (see above) — this is the
  package's actual safety guarantee, not the static check alone.
- `xsl:value-of select="."` (the bare self-reference shorthand) returns the
  escaped node markup instead of the text value, due to a narrow bug in the
  underlying engine's context handling — use `select="self::node()"` or
  `select="text()"` instead, both of which work correctly.

Stateless, offline, deterministic. License: MIT.
