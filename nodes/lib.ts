// Shared helpers for every node in this package: XML parsing, XPath
// evaluation, node serialization, and the structured Error contract.
// Not a node itself — imported by nodes/*.ts.
//
// Security posture (applies to every node that parses XML/XSLT/XSD text):
//  - @xmldom/xmldom (used for xml/xslt) never performs filesystem or network
//    I/O and never expands DTD-declared entities (internal or external) —
//    verified by inspection: it has no fs/http require anywhere in its
//    source, and an undefined entity reference is reported via onError
//    ("entity not found") rather than substituted. This closes XXE and
//    billion-laughs at the parser for every xpath/xmldom-based node
//    unconditionally, with no flag to pass.
//  - libxml2-wasm (used only for ValidateXsd) is parsed with XML_PARSE_NO_XXE
//    and XML_PARSE_NONET explicitly set (belt-and-suspenders — verified by
//    live test that a schema importing a remote URL resolves in ~5ms with no
//    network attempt even without these flags, because libxml2 removed its
//    built-in HTTP/FTP client; we set them anyway for explicitness) and
//    XML_PARSE_HUGE is never set, which keeps libxml2's own default 256-level
//    nesting cap in force.
//  - xsltjs's document() XPath function performs a real network fetch
//    (scripts/Utils.js calls the global fetch()) — this is patched to always
//    throw, unconditionally, at module load (see patchXsltNetworkFetch
//    below), closing that SSRF/exfiltration path regardless of what a
//    caller-supplied stylesheet contains.
//  - xsltjs's <xsl:apply-templates> reliably hangs the Node process
//    (confirmed empirically: every variant tested — default, explicit
//    child-axis select, descendant-axis select — never resolves or rejects).
//    TransformXslt statically rejects any stylesheet containing
//    xsl:apply-templates before ever invoking the engine, and additionally
//    wraps the transform in a hard wall-clock timeout as defense-in-depth
//    against any other not-yet-discovered hang in this "work in progress"
//    (the library's own description) engine.
//  - xpath.select's "//" (descendant-or-self) traversal is quadratic in
//    document nesting depth (measured: ~32ms at 1,000 levels, ~2.3s at 8,000
//    levels, extrapolating to minutes at 100,000) even though parsing itself
//    stays fast at that depth — checkNestingDepth bounds this before any
//    xpath evaluation runs.

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import { Error as ErrorMsg } from '../gen/messages_pb';

// Payload size (raw XML/XSLT/XSD byte length, namespace-map entry count) is
// the platform's job, not this package's, and every guard that only bounded
// THAT has been removed. Two bounds remain, and neither is a size guard:
//
// MAX_XML_DEPTH: xpath.select's "//" (descendant-or-self) traversal is
// quadratic in document nesting depth (measured: ~32ms at 1,000 levels,
// ~2.3s at 8,000, extrapolating to minutes at 100,000) even though parsing
// itself stays fast at that depth — a genuine algorithmic-complexity bound,
// not a memory ceiling. Generous relative to any real-world document (a few
// dozen levels at most); tight enough to keep that traversal well under a
// second.
export const MAX_XML_DEPTH = 1000;
// MAX_XPATH_LEN: the xpath library's own parser (XPathParser.parse) is a
// table-driven shift-reduce parser with an explicit array stack, not native
// recursion, so parsing itself cannot stack-overflow regardless of length.
// Evaluating the resulting AST, however, is done via each node type's own
// recursive .evaluate() method, so a pathologically deep expression (nested
// parens/predicates) could still risk a native stack overflow during
// EVALUATION — length is an imperfect but cheap proxy for that depth in the
// absence of a dedicated structural scan, so this is kept as a
// precautionary bound rather than removed outright.
export const MAX_XPATH_LEN = 10000;

/** A structured, deterministic failure — carries the same `code` vocabulary documented on the proto Error message. */
export class NodeError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'NodeError';
  }
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * Best-effort linear-scan nesting-depth bound over the raw XML text, run
 * BEFORE the DOM is built. Not a full XML tokenizer (it does not need to
 * be): it skips comments/CDATA/processing-instructions/declarations,
 * tracks open/close/self-closing element tags while respecting quoted
 * attribute values that may contain '>', and throws once depth exceeds the
 * bound. The authoritative well-formedness check is always the DOMParser
 * pass that follows — this exists solely to keep pathologically deep (but
 * otherwise small and well-formed) input from ever reaching xpath's
 * quadratic descendant-axis traversal.
 */
export function checkNestingDepth(xml: string, maxDepth: number = MAX_XML_DEPTH): void {
  let depth = 0;
  let i = 0;
  const n = xml.length;
  while (i < n) {
    if (xml.charCodeAt(i) !== 60 /* '<' */) {
      i++;
      continue;
    }
    if (xml.startsWith('<!--', i)) {
      const end = xml.indexOf('-->', i + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i + 9);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (xml.startsWith('<?', i)) {
      const end = xml.indexOf('?>', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (xml.startsWith('<!', i)) {
      // DOCTYPE or other markup declaration — skip to the matching top-level '>',
      // respecting a bracketed internal subset ("[ ... ]").
      let j = i + 2;
      let bracketDepth = 0;
      while (j < n) {
        const c = xml[j];
        if (c === '[') bracketDepth++;
        else if (c === ']') bracketDepth--;
        else if (c === '>' && bracketDepth <= 0) break;
        j++;
      }
      i = j + 1;
      continue;
    }
    // An element start or end tag. Scan to its closing '>', skipping over
    // quoted attribute values (which may themselves contain '>').
    let j = i + 1;
    const isClose = xml[j] === '/';
    let inQuote: string | null = null;
    while (j < n) {
      const c = xml[j];
      if (inQuote) {
        if (c === inQuote) inQuote = null;
      } else if (c === '"' || c === '\'') {
        inQuote = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }
    const tagText = xml.slice(i, j + 1);
    const selfClosing = tagText.endsWith('/>');
    if (isClose) {
      depth--;
    } else if (!selfClosing) {
      depth++;
      if (depth > maxDepth) {
        throw new NodeError('TOO_LARGE', `xml nesting depth exceeds ${maxDepth} levels`);
      }
    }
    i = j + 1;
  }
}

export interface ParseXmlOptions {
  /** Field name to use in an "is empty" error message. Defaults to 'xml'. */
  label?: string;
}

/**
 * Parse XML text into a Document, enforcing the nesting-depth bound and
 * treating BOTH a thrown parse error and any accumulated DOMParser onError
 * diagnostic (e.g. an unresolved entity reference, which xmldom reports
 * rather than throws) as INVALID_XML — see the module doc comment for why
 * an unresolved entity is never silently substituted.
 */
export function parseXmlDom(xmlText: string, options: ParseXmlOptions = {}): any {
  if (xmlText.trim().length === 0) {
    throw new NodeError('INVALID_XML', `${options.label ?? 'xml'} is empty`);
  }
  checkNestingDepth(xmlText);

  const errors: string[] = [];
  const parser = new DOMParser({
    onError: (level: string, msg: string) => {
      errors.push(`${level}: ${msg}`);
    },
  });
  let doc: any;
  try {
    doc = parser.parseFromString(xmlText, 'text/xml');
  } catch (e) {
    throw new NodeError('INVALID_XML', e instanceof Error ? e.message : String(e));
  }
  if (errors.length > 0) {
    throw new NodeError('INVALID_XML', errors.join('; '));
  }
  if (!doc || !doc.documentElement) {
    throw new NodeError('INVALID_XML', 'xml has no root element');
  }
  return doc;
}

/** Validate an XPath expression string itself (not its evaluation). */
export function checkXPathExpr(expr: string): void {
  if (!expr || expr.trim().length === 0) {
    throw new NodeError('INVALID_ARGUMENT', 'xpath is empty');
  }
  if (expr.length > MAX_XPATH_LEN) {
    throw new NodeError('INVALID_ARGUMENT', `xpath exceeds ${MAX_XPATH_LEN} characters`);
  }
}

/** Validate a caller-supplied namespace prefix -> URI map. No package-level
 * entry-count cap (the platform bounds payload size); each entry is O(1) to
 * check. */
export function checkNamespaces(namespaces: Record<string, string>): void {
  for (const [prefix, uri] of Object.entries(namespaces)) {
    if (!prefix || !uri) {
      throw new NodeError('INVALID_ARGUMENT', 'a namespaces entry has an empty prefix or uri');
    }
  }
}

/** Convert a jspb.Map<string,string> (or undefined) to a plain object. */
export function mapToObject(m: { toArray(): Array<[string, string]> } | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const [k, v] of m.toArray()) {
    out[k] = v;
  }
  return out;
}

/**
 * Evaluate `xpath` against `doc` with the given namespace map. Throws
 * NodeError('INVALID_XPATH', ...) for a syntax error or an unresolvable
 * namespace prefix (both surface as a thrown Error from the xpath library).
 */
export function evalXPath(
  doc: any,
  exprText: string,
  namespaces: Record<string, string>,
): xpath.SelectReturnType {
  checkXPathExpr(exprText);
  checkNamespaces(namespaces);
  const select = xpath.useNamespaces(namespaces);
  try {
    return select(exprText, doc, false);
  } catch (e) {
    throw new NodeError('INVALID_XPATH', e instanceof Error ? e.message : String(e));
  }
}

/** Like evalXPath, but requires (and returns) a node-set result. */
export function evalXPathNodeSet(
  doc: any,
  exprText: string,
  namespaces: Record<string, string>,
): any[] {
  const result = evalXPath(doc, exprText, namespaces);
  if (!Array.isArray(result)) {
    throw new NodeError('INVALID_XPATH', 'xpath expression did not evaluate to a node-set');
  }
  return result as any[];
}

/** The XPath string-value of a single DOM node, via the xpath library's own string() semantics (not reimplemented). */
export function stringValueOfNode(node: any): string {
  const select = xpath.useNamespaces({});
  const v = select('string(.)', node, true);
  return typeof v === 'string' ? v : String(v);
}

/**
 * Convert a raw xpath.select result (node-set | string | number | boolean |
 * null) to its XPath string() value: a node-set takes the first node's
 * string-value (or "" if empty); string/number/boolean use their own
 * canonical string form (JS's default String() conversion matches XPath's
 * number->string and boolean->string rules exactly).
 */
export function xpathResultToString(value: xpath.SelectReturnType): string {
  if (Array.isArray(value)) {
    return value.length === 0 ? '' : stringValueOfNode(value[0]);
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Evaluate `exprText` under XPath's number() conversion by delegating to the
 * library itself — wrapping the caller's expression as `number(EXPR)` rather
 * than converting the already-evaluated JS value ourselves, so the
 * conversion rules (node-set -> string-value of first node -> number;
 * non-numeric string -> NaN; etc.) are exactly the library's own, not a
 * reimplementation.
 */
export function evalXPathAsNumber(
  doc: any,
  exprText: string,
  namespaces: Record<string, string>,
): { value: number; isNaN: boolean } {
  checkXPathExpr(exprText);
  checkNamespaces(namespaces);
  const select = xpath.useNamespaces(namespaces);
  let raw: xpath.SelectReturnType;
  try {
    raw = select(`number(${exprText})`, doc, true);
  } catch (e) {
    throw new NodeError('INVALID_XPATH', e instanceof Error ? e.message : String(e));
  }
  const num = typeof raw === 'number' ? raw : Number(raw);
  return { value: Number.isNaN(num) ? 0 : num, isNaN: Number.isNaN(num) };
}

/** Evaluate `exprText` under XPath's boolean() conversion, delegating to the library the same way evalXPathAsNumber does. */
export function evalXPathAsBoolean(doc: any, exprText: string, namespaces: Record<string, string>): boolean {
  checkXPathExpr(exprText);
  checkNamespaces(namespaces);
  const select = xpath.useNamespaces(namespaces);
  try {
    return Boolean(select(`boolean(${exprText})`, doc, true));
  } catch (e) {
    throw new NodeError('INVALID_XPATH', e instanceof Error ? e.message : String(e));
  }
}

function escapeAttrValue(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Serialize a single matched DOM node back to an XML fragment. Attribute
 * nodes are special-cased to `name="value"` (XMLSerializer's own attribute
 * serialization emits a stray leading space and no enclosing element, which
 * is not a useful fragment on its own).
 */
export function serializeNode(node: any): string {
  if (node && node.nodeType === 2) {
    return `${node.name}="${escapeAttrValue(node.value)}"`;
  }
  return new XMLSerializer().serializeToString(node);
}

/** True iff the node is an Attr node (nodeType 2). */
export function isAttributeNode(node: any): boolean {
  return !!node && node.nodeType === 2;
}

/**
 * Convert any thrown value into the shared proto Error message: a
 * NodeError's own code/message pass through verbatim; anything else
 * (a library throwing a bare Error/TypeError we did not anticipate) maps to
 * `fallbackCode` with the thrown value's message, so every node's catch
 * block returns a structured error and never crashes.
 */
export function buildErrorMsg(e: unknown, fallbackCode: string): ErrorMsg {
  const err = new ErrorMsg();
  if (e instanceof NodeError) {
    err.setCode(e.code);
    err.setMessage(e.message);
  } else {
    err.setCode(fallbackCode);
    err.setMessage(e instanceof Error ? e.message : String(e));
  }
  return err;
}

/**
 * Walk the whole document collecting every xmlns / xmlns:prefix attribute,
 * de-duplicated by (prefix, uri) pair, in document order of first
 * occurrence. Done with a plain DOM walk (not the xpath library's
 * namespace:: axis, whose support varies) so it is unambiguous about
 * exactly what counts as "declared here" vs. merely in-scope.
 */
export function collectNamespaceDeclarations(doc: any): Array<{ prefix: string; uri: string }> {
  const seen = new Set<string>();
  const out: Array<{ prefix: string; uri: string }> = [];

  function visit(node: any): void {
    if (!node) return;
    if (node.nodeType === 1 && node.attributes) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes.item(i);
        const name: string = attr.name;
        let prefix = '';
        if (name === 'xmlns') {
          prefix = '';
        } else if (name.startsWith('xmlns:')) {
          prefix = name.slice('xmlns:'.length);
        } else {
          continue;
        }
        const uri: string = attr.value;
        const key = `${prefix} ${uri}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ prefix, uri });
        }
      }
    }
    const children = node.childNodes;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        visit(children.item(i));
      }
    }
  }

  visit(doc.documentElement);
  return out;
}
