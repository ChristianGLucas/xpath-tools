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
- A stylesheet using `xsl:apply-templates` is rejected outright rather than run —
  the underlying XSLT engine (`xsltjs`, a self-described work-in-progress) hangs
  indefinitely on that construct; this was found and confirmed by direct testing,
  not assumed.
- Malformed XML/XPath/XSLT/XSD always returns a structured error, never a crash.

## Known engine limitations (tested, not guessed)

- `xsl:apply-templates` is unsupported (see above) — use `xsl:for-each` +
  `xsl:call-template` instead.
- `xsl:value-of select="."` (the bare self-reference shorthand) returns the
  escaped node markup instead of the text value, due to a narrow bug in the
  underlying engine's context handling — use `select="self::node()"` or
  `select="text()"` instead, both of which work correctly.

Stateless, offline, deterministic. License: MIT.
