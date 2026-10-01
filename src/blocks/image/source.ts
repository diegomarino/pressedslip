/** @fileoverview Browser-safe bounded data URI parsing and PNG/SVG intrinsic sizing. */
import { hasPngSignature } from "fast-png";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

/** Maximum decoded source payload per image (2 MiB). */
export const MAX_IMAGE_BYTES: number = 2 * 1024 * 1024;
/** Formats accepted by the image block. */
export type ImageMime = "image/png" | "image/svg+xml";
/** Measured image source, with explicit dimensions in normalized SVGs. */
export interface ParsedImageSource {
  bytes: Uint8Array;
  mime: ImageMime;
  width: number;
  height: number;
  src: string;
}
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const xmlOptions = {
  preserveOrder: true,
  ignoreAttributes: false,
  parseTagValue: false,
  processEntities: false,
};
const parser = new XMLParser(xmlOptions);
const builder = new XMLBuilder(xmlOptions);
const vectorTags = new Set([
  "svg",
  "g",
  "defs",
  "symbol",
  "use",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "title",
  "desc",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "style",
]);

type XmlNode = Record<string, unknown>;
function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  return btoa(binary);
}
function checkSize(bytes: Uint8Array): void {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES)
    throw new Error("Image source must contain 1 byte to 2 MiB");
}
function readUri(src: string): { bytes: Uint8Array; mime: ImageMime } {
  const match = /^data:(image\/png|image\/svg\+xml);(base64|utf8),([\s\S]*)$/.exec(src);
  if (!match)
    throw new Error("Pass a PNG/SVG data URI; see imageFromBuffer (convert other formats to PNG)");
  const mime = match[1] as ImageMime;
  const encoding = match[2];
  const payload = match[3] ?? "";
  let bytes: Uint8Array;
  if (encoding === "base64") {
    if (
      payload.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload)
    )
      throw new Error("Invalid or oversized base64 image payload (maximum 2 MiB)");
    const binary = atob(payload);
    bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (encodeBase64(bytes) !== payload) throw new Error("Non-canonical base64 image payload");
  } else {
    if (mime !== "image/svg+xml" || payload.length > MAX_IMAGE_BYTES * 3)
      throw new Error("Only SVG accepts utf8 encoding (maximum 2 MiB)");
    bytes = encoder.encode(decodeURIComponent(payload));
  }
  checkSize(bytes);
  return { bytes, mime };
}
/** Check the supported URI encoding and decoded byte cap without decoding image pixels. */
export function validateImageUri(src: string): boolean {
  try {
    readUri(src);
    return true;
  } catch {
    return false;
  }
}
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  if (!hasPngSignature(bytes) || bytes.length < 33)
    throw new Error("Invalid or truncated PNG header");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8) !== 13 || String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR")
    throw new Error("PNG must begin with IHDR");
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (
    !width ||
    !height ||
    width > 0x7fffffff ||
    height > 0x7fffffff ||
    !Number.isSafeInteger(width * height * 4)
  )
    throw new Error("Invalid PNG dimensions");
  return { width, height };
}
function safeCss(raw: string): void {
  const value = raw.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code: string) =>
    String.fromCodePoint(
      Number.parseInt(code.startsWith("x") ? code.slice(1) : code, code.startsWith("x") ? 16 : 10),
    ),
  );
  if (/\\|@|\/\*/.test(value))
    throw new Error("SVG CSS escapes, imports and comments are unsupported");
  for (const match of value.matchAll(/url\s*\(([^)]*)\)/gi)) {
    if (!/^\s*['"]?#[A-Za-z_][\w:.-]*['"]?\s*$/.test(match[1] ?? ""))
      throw new Error("SVG external resource references are unsupported");
  }
}
function inspectNodes(nodes: XmlNode[]): void {
  for (const node of nodes) {
    for (const [tag, children] of Object.entries(node)) {
      if (tag === ":@") {
        for (const [name, raw] of Object.entries(children as Record<string, unknown>)) {
          const value = String(raw);
          const attr = name.replace(/^@_/, "");
          if (/^on/i.test(attr) || attr === "xml:base")
            throw new Error("SVG executable attributes are unsupported");
          if ((attr === "href" || attr === "xlink:href") && !/^#[A-Za-z_][\w:.-]*$/.test(value))
            throw new Error("SVG external resource references are unsupported");
          if (attr === "xmlns" && value !== "http://www.w3.org/2000/svg")
            throw new Error("Invalid SVG namespace");
          if (
            attr.includes(":") &&
            !["xmlns:xlink", "xlink:href", "xml:space", "xml:lang"].includes(attr)
          )
            throw new Error("Unsupported SVG namespace attribute");
          if (attr === "xmlns:xlink" && value !== "http://www.w3.org/1999/xlink")
            throw new Error("Invalid SVG xlink namespace");
          safeCss(value);
        }
      } else if (tag === "#text") {
        // Text nodes are inspected as CSS only inside style elements below.
      } else {
        if (["text", "tspan", "textPath"].includes(tag))
          throw new Error("SVG text is unsupported; convert text to paths");
        if (!vectorTags.has(tag)) throw new Error(`Unsupported SVG element: ${tag}`);
        if (tag === "style")
          safeCss((children as XmlNode[]).map((child) => String(child["#text"] ?? "")).join(""));
        if (Array.isArray(children)) inspectNodes(children as XmlNode[]);
      }
    }
  }
}
function svgDocument(bytes: Uint8Array): { nodes: XmlNode[]; attrs: Record<string, unknown> } {
  const xml = decoder.decode(bytes);
  const invalidXmlCharacter = /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u;
  if (invalidXmlCharacter.test(xml)) throw new Error("Invalid XML character in SVG");
  for (const reference of xml.matchAll(/&#(x[0-9a-f]+|[0-9]+);/gi)) {
    const raw = reference[1] ?? "";
    const hex = raw[0]?.toLowerCase() === "x";
    const code = Number.parseInt(hex ? raw.slice(1) : raw, hex ? 16 : 10);
    if (code > 0x10ffff || invalidXmlCharacter.test(String.fromCodePoint(code)))
      throw new Error("Invalid XML character reference in SVG");
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("SVG DTD and custom entities are unsupported");
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#(?:[0-9]+|x[0-9a-fA-F]+);)[A-Za-z#]/.test(xml))
    throw new Error("Undeclared SVG entity");
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error(`Invalid SVG XML: ${validation.err.msg}`);
  const parsed = parser.parse(xml) as XmlNode[];
  const nodes = parsed.filter((node) => !Object.keys(node).some((key) => key.startsWith("?")));
  if (nodes.length !== 1 || !Array.isArray(nodes[0]?.svg))
    throw new Error("Image source must have one SVG root element");
  inspectNodes(nodes);
  const root = nodes[0] as XmlNode;
  const attrs = (root[":@"] ?? {}) as Record<string, unknown>;
  root[":@"] = attrs;
  return { nodes, attrs };
}
function dimension(value: unknown): number | undefined {
  if (value === undefined || /^\d+(?:\.\d+)?%$/.test(String(value))) return undefined;
  const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(String(value));
  const result = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(result) || result <= 0)
    throw new Error("SVG dimensions must be finite and positive");
  return result;
}
/** Validate bytes and return a portable data URI; SVG sizing may be supplied later as hints. */
export function imageFromBuffer(bytes: Uint8Array, mime: ImageMime): string {
  checkSize(bytes);
  if (mime === "image/png") pngSize(bytes);
  else if (mime === "image/svg+xml") svgDocument(bytes);
  else throw new Error("Unsupported image MIME; convert to PNG");
  return `data:${mime};base64,${encodeBase64(bytes)}`;
}
/** Parse supported local sources and measure intrinsic size, using hints only as a fallback. */
export function parseImageSource(
  src: string,
  hints: { width?: number; height?: number } = {},
): ParsedImageSource {
  const { bytes, mime } = readUri(src);
  if (mime === "image/png") return { bytes, mime, ...pngSize(bytes), src };
  const { nodes, attrs } = svgDocument(bytes);
  let width = dimension(attrs["@_width"]);
  let height = dimension(attrs["@_height"]);
  const box = attrs["@_viewBox"];
  if (box !== undefined) {
    const values = String(box)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      values.length !== 4 ||
      values.some((value) => !Number.isFinite(value)) ||
      (values[2] ?? 0) <= 0 ||
      (values[3] ?? 0) <= 0
    )
      throw new Error("Invalid SVG viewBox");
    const boxWidth = values[2] as number;
    const boxHeight = values[3] as number;
    if (width !== undefined && height === undefined) height = (width * boxHeight) / boxWidth;
    else if (height !== undefined && width === undefined) width = (height * boxWidth) / boxHeight;
    width ??= boxWidth;
    height ??= boxHeight;
  }
  width ??= hints.width;
  height ??= hints.height;
  if (
    !width ||
    !height ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isSafeInteger(Math.ceil(width) * Math.ceil(height) * 4)
  )
    throw new Error("SVG needs usable width/height, viewBox, or positive dimension hints");
  attrs["@_xmlns"] ??= "http://www.w3.org/2000/svg";
  attrs["@_width"] = String(width);
  attrs["@_height"] = String(height);
  const normalized = encoder.encode(builder.build(nodes));
  return {
    bytes: normalized,
    mime,
    width,
    height,
    src: `data:${mime};base64,${encodeBase64(normalized)}`,
  };
}
