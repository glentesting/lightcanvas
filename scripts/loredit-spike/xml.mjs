/**
 * Minimal XML parser/serializer tuned to LOR .loredit machine-generated XML.
 *
 * Byte-fidelity design: attribute values and text nodes are stored RAW
 * (still escaped, exactly as they appear in the file). Whitespace between
 * elements is preserved as text nodes. Serializing a parsed tree therefore
 * reproduces the input byte-for-byte if the tokenizer is complete.
 *
 * decode()/encode() are used only when reading values for analysis or when
 * constructing new nodes.
 */

export function parseXml(str) {
  let pos = 0;
  const len = str.length;
  let decl = null;

  if (str.startsWith("﻿")) {
    pos = 1;
  }
  const bom = pos === 1;

  if (str.startsWith("<?xml", pos)) {
    const end = str.indexOf("?>", pos);
    if (end === -1) throw new Error("Unterminated XML declaration");
    decl = str.slice(pos, end + 2);
    pos = end + 2;
  }

  const root = { name: "#document", attrs: [], children: [], selfClosing: false };
  const stack = [root];

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
      if (top.name !== name) {
        throw new Error(`Mismatched close tag </${name}> for <${top.name}> at ${pos}`);
      }
      pos = end + 1;
      continue;
    }

    // Open tag
    let i = pos + 1;
    while (i < len && !/[\s/>]/.test(str[i])) i++;
    const name = str.slice(pos + 1, i);
    const node = { name, attrs: [], children: [], selfClosing: false };

    // Attributes
    while (i < len) {
      while (i < len && /\s/.test(str[i])) i++;
      if (str[i] === ">") { i++; break; }
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
export function serializeXml(doc) {
  const out = [];
  if (doc.bom) out.push("﻿");
  if (doc.decl) out.push(doc.decl);
  for (const child of doc.root.children) writeNode(child, out);
  return out.join("");
}

function writeNode(node, out) {
  if (node.text !== undefined) { out.push(node.text); return; }
  if (node.comment !== undefined) { out.push(node.comment); return; }
  if (node.cdata !== undefined) { out.push(node.cdata); return; }
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
 * This is the "could we generate this file from scratch" test.
 */
export function generateXml(doc) {
  const out = [];
  if (doc.bom) out.push("﻿");
  if (doc.decl) out.push(doc.decl, "\r\n");
  const elements = doc.root.children.filter((c) => c.name);
  for (const el of elements) genNode(el, out, 0, el === elements[elements.length - 1]);
  return out.join("");
}

function genNode(node, out, depth, isLast) {
  const indent = "  ".repeat(depth);
  out.push(indent, "<", node.name);
  for (const [k, v, q] of node.attrs) {
    const quote = q ?? '"';
    out.push(" ", k, "=", quote, v, quote);
  }
  const childElements = node.children.filter((c) => c.name);
  const textContent = node.children
    .filter((c) => c.text !== undefined && c.text.trim() !== "")
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

export function decode(raw) {
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
export function encode(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- tree helpers --------------------------------------------------------

export function attr(node, name) {
  const found = node.attrs.find(([k]) => k === name);
  return found ? decode(found[1]) : undefined;
}

export function childElements(node) {
  return node.children.filter((c) => c.name);
}

export function findChild(node, name) {
  return node.children.find((c) => c.name === name);
}

export function findChildren(node, name) {
  return node.children.filter((c) => c.name === name);
}

/** Depth-first walk over element nodes. */
export function walk(node, fn, path = []) {
  if (node.name && node.name !== "#document") fn(node, path);
  for (const child of node.children) {
    if (child.name) walk(child, fn, [...path, node.name]);
  }
}

/** Create a new element node with plain (unescaped) attribute values. */
export function el(name, attrsObj = {}, children = [], selfClosing = children.length === 0) {
  return {
    name,
    attrs: Object.entries(attrsObj).map(([k, v]) => [k, encode(v), '"']),
    children,
    selfClosing,
  };
}
