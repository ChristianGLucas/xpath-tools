# xpath-tools

Composable [Axiom](https://axiom.co) nodes for deterministic **XPath 1.0 querying**,
**XSLT 1.0 transformation**, and **XSD schema validation** of XML documents.

Built for the Axiom marketplace under the `christiangeorgelucas` handle. Distinct
from `dataformat-tools` (XML↔JSON conversion, well-formedness validation,
pretty-print — no XPath/XSLT/XSD) and from `json-query-tools` (JSON, not XML).

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
