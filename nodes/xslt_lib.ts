// XSLT-specific helpers, isolated from lib.ts because they carry mitigations
// for real bugs discovered by hand in xsltjs 0.0.75 (a library that
// describes itself as "still a work in progress"):
//
//  1. xsltjs's document() XPath function performs a real network fetch
//     (scripts/Utils.js: `const response = await fetch(url)`). A caller-
//     supplied stylesheet using document('http://internal-host/...') would
//     make this node perform outbound requests on the caller's behalf — an
//     SSRF/exfiltration path. patchXsltNetworkFetch() monkey-patches the
//     exact shared Utils.fetch the library calls (verified: requiring the
//     same resolved path returns the identical module-cached object xsltjs
//     itself uses) to always throw, unconditionally, regardless of what URL
//     a stylesheet requests. Also closes xsl:import/xsl:include of a remote
//     URL, which goes through the same Utils.fetch.
//
//  2. xsltjs's template-DISPATCH machinery (matching a node against the
//     stylesheet's templates to decide what processes it) reliably HANGS the
//     process, and — confirmed by two independent rounds of hands-on
//     testing, not assumed from the first repro found — this is broader and
//     less predictable than any single static rule can fully enumerate:
//       (a) an explicit <xsl:apply-templates> anywhere hangs, every axis
//           variant tried.
//       (b) a stylesheet with NO top-level <xsl:template match="/"> at all
//           hangs via the processor's own implicit top-level dispatch call
//           — with ZERO literal apply-templates text in the source.
//       (c) even an EXACT, literal <xsl:template match="/"> still hangs if
//           its body produces no output (empty, self-closing, comment-only,
//           or a false xsl:if) — confirmed directly, twice.
//       (d) an otherwise-identical, otherwise-safe stylesheet hangs if the
//           XSL namespace is bound to any prefix other than the literal
//           "xsl" (a different prefix, or a default/unprefixed binding) —
//           both are spec-legal XSLT, but the engine appears to key
//           dispatch off the literal prefix text, not the namespace URI.
//       (e) match="/" surrounded by whitespace, or combined with another
//           alternative via "|" (e.g. match="/|foo"), is NOT treated as a
//           root template by the engine even though it is spec-legal —
//           confirmed to hang despite a real, output-producing body.
//     xsl:for-each / xsl:copy-of / xsl:call-template never trigger
//     match-based dispatch (confirmed working in every test). Given (c)
//     cannot be distinguished from a safe empty-output template by any
//     static check short of actually interpreting the stylesheet,
//     rejectUnsafeDispatch() below is a FAST PATH, not a complete proof of
//     safety: it statically catches (a), (b), (d), and (e) — the cases that
//     ARE mechanically detectable from the stylesheet text alone — and
//     rejects immediately with a clear error. (c), and anything else not
//     yet discovered, falls through to actually running the engine, which
//     is why every transform is ALSO wrapped in withTimeout() below: that is
//     the package's real safety guarantee (bounded latency, never an
//     indefinite hang), not the static check by itself. Both `axiom.yaml`
//     and this file's docs describe the guarantee that way — do not
//     overclaim the static check alone as sufficient in either place.
//
//  3. XSLT.process's XML-declaration handling is driven by XsltContext.output,
//     a STATIC (class-level, cross-invocation) field only ever set as a side
//     effect of encountering an <xsl:output> element — meaning (a) a
//     stylesheet with method="text"/"html" still gets an XML declaration
//     prepended because the prepend logic never checks method, and (b) a
//     stylesheet with NO <xsl:output> element at all can inherit a STALE
//     decl left over from a PRIOR, unrelated call in the same process, since
//     the field is never reset. detectOutputMethod() independently reads
//     the caller's own <xsl:output> (if any) via a namespace-aware XPath
//     query — never touching the library's shared static state — and
//     normalizeOutput() reconstructs the declaration (or omits it) itself
//     from that independent reading, making the result depend only on this
//     call's own input.

import { evalXPath, NodeError } from './lib';

const XSL_NS = 'http://www.w3.org/1999/XSL/Transform';

let networkPatched = false;

/** Idempotently patch xsltjs's shared Utils.fetch to always fail closed. Safe to call on every invocation. */
export function patchXsltNetworkFetch(): void {
  if (networkPatched) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const UtilsMod = require('xsltjs/scripts/Utils.js');
  const Utils = UtilsMod.Utils;
  Utils.fetch = async (url: string) => {
    throw new Error(`network/document() access is disabled for this node: blocked fetch of "${url}"`);
  };
  networkPatched = true;
}

/**
 * Statically reject the mechanically-detectable ways to reach xsltjs's
 * hanging template-dispatch machinery (see the module doc comment for the
 * full, hands-on-tested list). This is a FAST PATH that catches the common
 * cases immediately — it is NOT a proof the engine will not still hang on
 * something it doesn't catch (see withTimeout, which is the package's real
 * safety net). Run before the engine ever sees the stylesheet.
 */
export function rejectUnsafeDispatch(xsltDoc: any): void {
  const applyTemplates = evalXPath(xsltDoc, '//xsl:apply-templates', { xsl: XSL_NS });
  if (Array.isArray(applyTemplates) && applyTemplates.length > 0) {
    throw new NodeError(
      'INVALID_XSLT',
      'xsl:apply-templates is not supported by this package\'s XSLT engine (it hangs rather than ' +
        'executing) — rewrite the stylesheet using xsl:for-each and xsl:call-template instead.',
    );
  }

  // The engine's dispatch appears to key off the literal "xsl" prefix text,
  // not the namespace URI — a different prefix or a default/unprefixed
  // binding for the XSL namespace hangs even with an otherwise-safe,
  // output-producing root template (confirmed by direct testing). Require
  // the stylesheet's own root element to literally use "xsl:stylesheet" or
  // "xsl:transform", not merely something namespace-equivalent.
  const root = xsltDoc.documentElement;
  const rootIsXslPrefixed =
    !!root && root.prefix === 'xsl' && root.namespaceURI === XSL_NS && (root.localName === 'stylesheet' || root.localName === 'transform');
  if (!rootIsXslPrefixed) {
    throw new NodeError(
      'INVALID_XSLT',
      'the stylesheet root must be literally <xsl:stylesheet> or <xsl:transform> using the exact ' +
        'prefix "xsl" for the XSL namespace — a different prefix or a default/unprefixed namespace ' +
        'binding is spec-legal XSLT but hangs this package\'s engine.',
    );
  }

  // The engine only recognizes a root template whose match attribute is the
  // EXACT literal string "/" — surrounding whitespace or a "|"-combined
  // alternative pattern (e.g. "/|foo", spec-legal and equivalent XSLT) is
  // NOT treated as a root entry point and hangs despite passing a more
  // lenient text check (confirmed by direct testing) — so no leniency here.
  const matchAttrs = evalXPath(xsltDoc, '/xsl:stylesheet/xsl:template/@match|/xsl:transform/xsl:template/@match', {
    xsl: XSL_NS,
  });
  const hasRootTemplate = Array.isArray(matchAttrs) && matchAttrs.some((attr: any) => attr.value === '/');
  if (!hasRootTemplate) {
    throw new NodeError(
      'INVALID_XSLT',
      'this stylesheet has no top-level <xsl:template match="/"> (the match value must be the exact ' +
        'literal string "/" — not surrounded by whitespace, and not combined with another pattern via ' +
        '"|"). Without one, the engine falls back to its own implicit template dispatch for the ' +
        'document root, which hangs rather than executing (the same underlying issue as ' +
        'xsl:apply-templates).',
    );
  }
}

export interface OutputSpec {
  method: string; // 'xml' | 'html' | 'text' (or a caller-declared custom value)
  encoding: string;
  omitDeclaration: boolean;
}

/** Independently read the stylesheet's own top-level <xsl:output>, ignoring the engine's internal (unreliable, cross-call-shared) state. */
export function detectOutputSpec(xsltDoc: any): OutputSpec {
  const node = evalXPath(xsltDoc, '/xsl:stylesheet/xsl:output|/xsl:transform/xsl:output', { xsl: XSL_NS });
  const first: any = Array.isArray(node) && node.length > 0 ? node[0] : null;
  if (!first) {
    return { method: 'xml', encoding: 'UTF-8', omitDeclaration: false };
  }
  const getAttr = (name: string): string | null => {
    const a = first.attributes ? first.attributes.getNamedItem(name) : null;
    return a ? a.value : null;
  };
  const method = getAttr('method') || 'xml';
  const encoding = getAttr('encoding') || 'UTF-8';
  const omit = (getAttr('omit-xml-declaration') || 'no').toLowerCase() === 'yes';
  return { method, encoding, omitDeclaration: omit };
}

/**
 * Strip whatever (possibly wrong, possibly stale) XML declaration xsltjs put
 * on the output, then re-add one ourselves iff our own independent reading
 * of the stylesheet says method is "xml" and omit-xml-declaration is not
 * "yes". method "text"/"html" (and any other declared method) never gets a
 * declaration, matching the XSLT 1.0 spec's intent even though the engine's
 * own prepend logic does not check method itself.
 */
export function normalizeOutput(rawOutput: string, spec: OutputSpec): string {
  const body = rawOutput.replace(/^<\?xml[^?]*\?>\s*\n?/, '');
  if (spec.method === 'xml' && !spec.omitDeclaration) {
    return `<?xml version="1.0" encoding="${spec.encoding}"?>\n${body}`;
  }
  return body;
}

/**
 * Race `p` against a hard wall-clock timeout, rejecting with an
 * INVALID_XSLT NodeError if `p` has not settled by `ms`. This — not
 * rejectUnsafeDispatch's static check — is this package's REAL guarantee
 * against xsltjs's dispatch hang: rejectUnsafeDispatch catches the
 * mechanically-detectable trigger cases immediately (see its doc comment),
 * but at least one known trigger (an exact, literal root template whose
 * body produces no output) cannot be told apart from a safe empty-output
 * template by any static check, and there may be others not yet found in
 * this "work in progress" engine. Whatever gets through the static check
 * and still hangs is bounded here to `ms` instead of hanging the caller
 * indefinitely.
 */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new NodeError('INVALID_XSLT', `XSLT transform did not complete within ${ms}ms`));
    }, ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}
