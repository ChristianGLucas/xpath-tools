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
//  2. xsltjs's <xsl:apply-templates> reliably HANGS the process — confirmed
//     empirically with the default axis, an explicit child-axis select, and
//     a descendant-axis select; none ever resolved or rejected within a 15s
//     wait. This is arguably the single most common XSLT construct, so
//     rejectApplyTemplates() statically scans the parsed stylesheet and
//     fails fast with a clear error instead of ever invoking the engine on
//     it — turning an indefinite hang into an immediate, honest
//     "unsupported" response.
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
 * Reject a stylesheet containing <xsl:apply-templates> anywhere, before the
 * engine ever runs on it (see the module doc comment: this reliably hangs
 * the process in xsltjs 0.0.75).
 */
export function rejectApplyTemplates(xsltDoc: any): void {
  const matches = evalXPath(xsltDoc, '//xsl:apply-templates', { xsl: XSL_NS });
  if (Array.isArray(matches) && matches.length > 0) {
    throw new NodeError(
      'INVALID_XSLT',
      'xsl:apply-templates is not supported by this package\'s XSLT engine (it hangs rather than ' +
        'executing) — rewrite the stylesheet using xsl:for-each and xsl:call-template instead.',
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
 * INVALID_XSLT NodeError if `p` has not settled by `ms`. Defense-in-depth
 * against any not-yet-discovered hang in xsltjs beyond the known
 * apply-templates case (which rejectApplyTemplates already screens out
 * before this ever runs) — converts "the node never responds" into a
 * bounded, structured failure.
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
