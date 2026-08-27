/**
 * Minimal XML parser/serializer tuned to LOR .loredit machine-generated XML.
 *
 * Promoted from scripts/loredit-spike/xml.mjs, where it was proven to
 * round-trip a real 11 MB purchased sequence (and all five official LOR
 * sample files) byte-identically — both by raw echo and by structural
 * regeneration from convention (UTF-8 BOM, CRLF, 2-space indent, ` />`
 * self-closing, no trailing newline).
 *
 * Byte-fidelity design: attribute values and text nodes are stored RAW
 * (still escaped, exactly as they appear in the file). Whitespace between
 * elements is preserved as text nodes. Serializing a parsed tree therefore
 * reproduces the input byte-for-byte if the tokenizer is complete.
 *
 * decode()/encode() are used only when reading values for analysis or when
 * constructing new nodes.
 */

export interface XmlElement {
  name: string;
  /** [name, rawValue, quoteChar] */
  attrs: Array<[string, string, string?]>;
  children: XmlNode[];
  selfClosing: boolean;
}

export interface XmlText {
  text: string;
}
export interface XmlComment {
  comment: string;
}
export interface XmlCdata {
  cdata: string;
}

export type XmlNode = XmlElement | XmlText | XmlComment | XmlCdata;

export interface XmlDocument {
  bom: boolean;
  decl: string | null;
  root: XmlElement;
}

export function isElement(node: XmlNode): node is XmlElement {
  return (node as XmlElement).name !== undefined;
}

const BOM = "﻿";

export function parseXml(str: string): XmlDocument {
  let pos = 0;
  const len = str.length;
  let decl: string | null = null;

  if (str.startsWith(BOM)) {
    pos = 1;
  }
  const bom = pos === 1;

  if (str.startsWith("<?xml", pos)) {
    const end = str.indexOf("?>", pos);
    if (end === -1) throw new Error("Unterminated XML declaration");
    decl = str.slice(pos, end + 2);
    pos = end + 2;
  }

  const root: XmlElement = { name: "#document", attrs: [], children: [], selfClosing: false };
  const stack: XmlElement[] = [root];

  while (pos < len) {
    const lt = str.indexOf("<", pos);
    if (lt === -1) {
      const tail = str.slice(pos);
      if (tail.length) stack[stack.length - 1].children.push({ text: tail });
      break;
    }
    if (lt > pos) {
      stack[stack.length - 1].children.push({ text: str.slice(pos, lt) });
    }
    pos = lt;

    if (str.startsWith("<!--", pos)) {
      const end = str.indexOf("-->", pos);
      if (end === -1) throw new Error(`Unterminated comment at ${pos}`);
      stack[stack.length - 1].children.push({ comment: str.slice(pos, end + 3) });
      pos = end + 3;
      continue;
    }
    if (str.startsWith("<![CDATA[", pos)) {
      const end = str.indexOf("]]>", pos);
      if (end === -1) throw new Error(`Unterminated CDATA at ${pos}`);
      stack[stack.length - 1].children.push({ cdata: str.slice(pos, end + 3) });
      pos = end + 3;
      continue;
    }
    if (str.startsWith("</", pos)) {
      const end = str.indexOf(">", pos);
      if (end === -1) throw new Error(`Unterminated close tag at ${pos}`);
      const name = str.slice(pos + 2, end).trim();
      const top = stack.pop();
      if (!top || top.name !== name) {
        throw new Error(`Mismatched close tag </${name}> for <${top?.name}> at ${pos}`);
      }
      pos = end + 1;
      continue;
    }

    // Open tag
    let i = pos + 1;
    while (i < len && !/[\s/>]/.test(str[i])) i++;
    const name = str.slice(pos + 1, i);
    const node: XmlElement = { name, attrs: [], children: [], selfClosing: false };

    // Attributes
    while (i < len) {
      while (i < len && /\s/.test(str[i])) i++;
      if (str[i] === ">") {
        i++;
        break;
      }
      if (str[i] === "/") {
        if (str[i + 1] !== ">") throw new Error(`Bad tag end at ${i}`);
        node.selfClosing = true;
        i += 2;
        break;
      }
      let j = i;
      while (j < len && str[j] !== "=" && !/\s/.test(str[j])) j++;
      const attrName = str.slice(i, j);
      while (j < len && /\s/.test(str[j])) j++;
      if (str[j] !== "=") throw new Error(`Attribute ${attrName} without value at ${j}`);
      j++;
      while (j < len && /\s/.test(str[j])) j++;
      const quote = str[j];
      if (quote !== '"' && quote !== "'") throw new Error(`Unquoted attribute at ${j}`);
      const vEnd = str.indexOf(quote, j + 1);
      if (vEnd === -1) throw new Error(`Unterminated attribute value at ${j}`);
      node.attrs.push([attrName, str.slice(j + 1, vEnd), quote]);
      i = vEnd + 1;
    }

    stack[stack.length - 1].children.push(node);
    if (!node.selfClosing) stack.push(node);
    pos = i;
  }

  if (stack.length !== 1) {
    throw new Error(`Unclosed elements: ${stack.slice(1).map((n) => n.name).join(", ")}`);
  }
  return { bom, decl, root };
}

/** Serialize preserving everything raw (inverse of parseXml). */
export function serializeXml(doc: XmlDocument): string {
  const out: string[] = [];
  if (doc.bom) out.push(BOM);
  if (doc.decl) out.push(doc.decl);
  for (const child of doc.root.children) writeNode(child, out);
  return out.join("");
}

function writeNode(node: XmlNode, out: string[]): void {
  if ("text" in node) {
    out.push(node.text);
    return;
  }
  if ("comment" in node) {
    out.push(node.comment);
    return;
  }
  if ("cdata" in node) {
    out.push(node.cdata);
    return;
  }
  out.push("<", node.name);
  for (const [k, v, q] of node.attrs) {
    const quote = q ?? '"';
    out.push(" ", k, "=", quote, v, quote);
  }
  if (node.selfClosing) {
    out.push(" />");
  } else {
    out.push(">");
    for (const child of node.children) writeNode(child, out);
    out.push("</", node.name, ">");
  }
}

/**
 * Structural re-generation: ignores preserved whitespace text nodes and
 * reconstructs formatting from convention (CRLF, 2-space indent, ` />`).
 * This is what the exporter uses to emit new files.
 */
export function generateXml(doc: XmlDocument): string {
  const out: string[] = [];
  if (doc.bom) out.push(BOM);
  if (doc.decl) out.push(doc.decl, "\r\n");
  const elements = doc.root.children.filter(isElement);
  for (const el of elements) genNode(el, out, 0, el === elements[elements.length - 1]);
  return out.join("");
}

function genNode(node: XmlElement, out: string[], depth: number, isLast: boolean): void {
  const indent = "  ".repeat(depth);
  out.push(indent, "<", node.name);
  for (const [k, v, q] of node.attrs) {
    const quote = q ?? '"';
    out.push(" ", k, "=", quote, v, quote);
  }
  const childElements = node.children.filter(isElement);
  const textContent = node.children
    .filter((c): c is XmlText => "text" in c && c.text.trim() !== "")
    .map((c) => c.text)
    .join("");

  if (node.selfClosing) {
    out.push(" />");
  } else if (childElements.length === 0 && textContent === "") {
    out.push("></", node.name, ">");
  } else if (childElements.length === 0) {
    out.push(">", textContent, "</", node.name, ">");
  } else {
    out.push(">\r\n");
    for (const child of childElements) genNode(child, out, depth + 1, false);
    out.push(indent, "</", node.name, ">");
  }
  if (!isLast) out.push("\r\n");
}

// --- value helpers -------------------------------------------------------

export function decode(raw: string): string {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

/** Escape a plain value for use as a raw attribute value (matches observed LOR escaping). */
export function encode(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- tree helpers --------------------------------------------------------

export function attr(node: XmlElement, name: string): string | undefined {
  const found = node.attrs.find(([k]) => k === name);
  return found ? decode(found[1]) : undefined;
}

export function setAttr(node: XmlElement, name: string, value: string | number): void {
  const found = node.attrs.find(([k]) => k === name);
  if (found) found[1] = encode(value);
  else node.attrs.push([name, encode(value), '"']);
}

export function childElements(node: XmlElement): XmlElement[] {
  return node.children.filter(isElement);
}

export function findChild(node: XmlElement, name: string): XmlElement | undefined {
  return node.children.find((c): c is XmlElement => isElement(c) && c.name === name);
}

export function findChildren(node: XmlElement, name: string): XmlElement[] {
  return node.children.filter((c): c is XmlElement => isElement(c) && c.name === name);
}

/** Depth-first walk over element nodes. */
export function walk(node: XmlElement, fn: (el: XmlElement, path: string[]) => void, path: string[] = []): void {
  if (node.name && node.name !== "#document") fn(node, path);
  for (const child of node.children) {
    if (isElement(child)) walk(child, fn, [...path, node.name]);
  }
}

/** Create a new element node with plain (unescaped) attribute values. */
export function el(
  name: string,
  attrsObj: Record<string, string | number> = {},
  children: XmlNode[] = [],
  selfClosing: boolean = children.length === 0
): XmlElement {
  return {
    name,
    attrs: Object.entries(attrsObj).map(([k, v]) => [k, encode(v), '"']),
    children,
    selfClosing,
  };
}
