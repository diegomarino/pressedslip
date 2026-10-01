/** @fileoverview Image data URI validation and intrinsic sizing regression tests. */
import { encode } from "fast-png";
import { describe, expect, it } from "vitest";
import { imageFromBuffer, MAX_IMAGE_BYTES, parseImageSource, validateImageUri } from "../source.js";

const svg = (body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(body)}`;
const png = () => encode({ width: 2, height: 1, channels: 1, data: new Uint8Array([0, 255]) });
describe("image sources", () => {
  it("round trips offset bytes and measures PNG instead of hints", () => {
    const bytes = png();
    const padded = new Uint8Array(bytes.length + 4);
    padded.set(bytes, 2);
    const src = imageFromBuffer(padded.subarray(2, -2), "image/png");
    expect(parseImageSource(src, { width: 9, height: 9 })).toMatchObject({
      width: 2,
      height: 1,
      mime: "image/png",
      bytes,
    });
  });
  it("round trips UTF-8 SVG and normalizes fallback dimensions", () => {
    const bytes = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><title>雪</title><rect width="8" height="4"/></svg>',
    );
    const parsed = parseImageSource(imageFromBuffer(bytes, "image/svg+xml"), {
      width: 8,
      height: 4,
    });
    expect(parsed).toMatchObject({ width: 8, height: 4 });
    expect(new TextDecoder().decode(parsed.bytes)).toContain('width="8" height="4"');
    expect(new TextDecoder().decode(parsed.bytes)).toContain("雪");
  });
  it.each([
    ['<svg width="12" height="6" viewBox="0 0 40 20"/>', 12, 6],
    ['<svg viewBox="-1 -2 40 20"/>', 40, 20],
    ['<svg width="12px" height="6px"/>', 12, 6],
  ])("measures %s", (xml, w, h) =>
    expect(parseImageSource(svg(xml), { width: 3, height: 3 })).toMatchObject({
      width: w,
      height: h,
    }));
  it.each([
    "https://example.org/image.png",
    "data:image/jpeg;base64,AAAA",
    "data:image/png;base64,",
    "data:image/png;base64,A===",
    "data:image/png;base64,AA A=",
    "data:image/svg+xml;utf8,%FF",
  ])("rejects invalid URI %s", (src) => expect(validateImageUri(src)).toBe(false));
  it("checks exact decoded byte cap", () => {
    expect(validateImageUri(`data:image/png;base64,${btoa("x".repeat(MAX_IMAGE_BYTES))}`)).toBe(
      true,
    );
    expect(validateImageUri(`data:image/png;base64,${btoa("x".repeat(MAX_IMAGE_BYTES + 1))}`)).toBe(
      false,
    );
    expect(() => imageFromBuffer(new Uint8Array(MAX_IMAGE_BYTES + 1), "image/png")).toThrow(
      /2 MiB/,
    );
  });
  it.each([
    "<svg><path",
    "<not-svg/>",
    '<svg width="0" height="2"/>',
    '<svg width="Infinity" height="2"/>',
    '<svg width="2" height="NaN"/>',
    '<svg viewBox="0 0 0 2"/>',
    "<svg/>",
  ])("rejects malformed or unmeasurable SVG %s", (xml) =>
    expect(() => parseImageSource(svg(xml))).toThrow());
  it.each([
    '<!DOCTYPE svg [<!ENTITY x "test">]><svg width="2" height="2"/>',
    '<svg width="2" height="2"><script>alert(1)</script></svg>',
    '<svg width="2" height="2" onload="foo()"/>',
    '<svg width="2" height="2"><image href="https://example.org/x.png"/></svg>',
    '<svg width="2" height="2"><use href="data:image/svg+xml;base64,AAA"/></svg>',
    '<svg width="2" height="2"><style>@import "https://example.org/x.css";</style></svg>',
    '<svg width="2" height="2"><path fill="url(https://example.org/x)"/></svg>',
    '<svg width="2" height="2"><foreignObject/></svg>',
  ])("rejects unsafe SVG %s", (xml) => expect(() => parseImageSource(svg(xml))).toThrow());
  it.each([
    '<svg width="2" height="2"><path fill="u&#114;l(https://example.org/x)"/></svg>',
    '<svg width="2" height="2"><style>&#64;import "https://example.org/x.css";</style></svg>',
    '<svg width="2" height="2">&custom;</svg>',
    '<svg width="2" height="2"><style><![CDATA[@import "https://example.org/x.css";]]></style></svg>',
  ])("rejects encoded external references and undeclared entities %s", (xml) =>
    expect(() => parseImageSource(svg(xml))).toThrow());
  it("derives a missing axis proportionally from viewBox", () => {
    expect(parseImageSource(svg('<svg width="100" viewBox="0 0 200 100"/>'))).toMatchObject({
      width: 100,
      height: 50,
    });
    expect(parseImageSource(svg('<svg height="50" viewBox="0 0 200 100"/>'))).toMatchObject({
      width: 100,
      height: 50,
    });
  });
  it("preserves predefined entities through normalization", () => {
    const result = parseImageSource(
      svg('<svg width="2" height="2"><title>a &amp; b</title></svg>'),
    );
    expect(new TextDecoder().decode(result.bytes)).toContain("a &amp; b");
  });
  it("rejects foreign namespace attributes", () => {
    expect(() =>
      parseImageSource(
        svg(
          '<svg width="2" height="2" xmlns:x="https://example.org"><use x:href="https://example.org/x"/></svg>',
        ),
      ),
    ).toThrow();
  });
  it("accepts internal vector references", () => {
    expect(
      parseImageSource(
        svg(
          '<svg width="4" height="4"><defs><path id="x" d="M0 0h4v4H0z"/></defs><use href="#x" fill="url(#x)"/></svg>',
        ),
      ).width,
    ).toBe(4);
  });
  it("rejects truncated or mislabeled PNG and invalid UTF-8", () => {
    expect(() => parseImageSource("data:image/png;base64,AAAA")).toThrow(/PNG/);
    expect(() => imageFromBuffer(new Uint8Array([255]), "image/svg+xml")).toThrow();
    expect(() => imageFromBuffer(new TextEncoder().encode("<svg/>"), "image/png")).toThrow(/PNG/);
  });
});

it("supplies the SVG namespace when omitted", () => {
  const source = `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="20" height="20"><rect width="20" height="20"/></svg>')}`;
  const result = parseImageSource(source);
  expect(atob(result.src.split(",")[1] ?? "")).toContain('xmlns="http://www.w3.org/2000/svg"');
});

it.each([
  "\u0000",
  "&#0;",
  "&#xD800;",
  "&#x110000;",
])("rejects XML-invalid character %s", (character) => {
  const source = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/>${character}</svg>`)}`;
  expect(() => parseImageSource(source)).toThrow(/XML character/i);
});

it.each([
  "text",
  "tspan",
  "textPath",
])("requires embedded SVG %s to be converted to paths", (tag) => {
  const source = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><${tag}>A</${tag}></svg>`)}`;
  expect(() => parseImageSource(source)).toThrow(/convert.*paths/i);
});

it.each([
  "AMP",
  "LT",
  "GT",
  "QUOT",
  "APOS",
])("rejects case-invalid predefined entity %s", (name) => {
  const source = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg width="20" height="20"><rect width="20" height="20"/><title>&${name};</title></svg>`)}`;
  expect(() => parseImageSource(source)).toThrow(/entity/i);
});
