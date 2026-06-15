/**
 * @fileoverview Unit tests for measureSvgBounds — the canvas-overflow detector.
 *
 * Scenario coverage:
 *   1. Clean SVG (no overflow) → null.
 *   2. Bare path with absolute M/L past width → reports overflowPx.
 *   3. Path inside <g transform="translate(...)"> contributing to absolute x.
 *   4. Path inside <g transform="matrix(a,b,c,d,e,f)"> with e as x-offset.
 *   5. Nested <g> transforms compose (CTM stack).
 *   6. Content inside <mask> / <clipPath> is ignored.
 *   7. Lowercase (relative) path commands track current-point x.
 *   8. Quadratic / cubic control points contribute to maxX (curve overshoot).
 *   9. Canvas width parsed from viewBox or width attr.
 */
import { describe, expect, it } from "vitest";
import { measureSvgBounds } from "../measure-svg-bounds.js";

function svgWith(inner: string, width = 200): string {
  return `<svg width="${width}" height="100" viewBox="0 0 ${width} 100" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

describe("measureSvgBounds", () => {
  it("returns null when no path exceeds canvas width", () => {
    const svg = svgWith(`<path d="M10 10L50 10L50 50L10 50Z"/>`, 200);
    expect(measureSvgBounds(svg)).toBeNull();
  });

  it("detects absolute M/L coords past width", () => {
    const svg = svgWith(`<path d="M10 10L250 10"/>`, 200);
    const result = measureSvgBounds(svg);
    expect(result).not.toBeNull();
    expect(result?.widthPx).toBe(200);
    expect(result?.overflowPx).toBeCloseTo(50, 5);
  });

  it('applies <g transform="translate(x,y)"> to inner path coords', () => {
    // Path raw max x = 50; translate +160 → absolute 210; canvas 200 → overflow 10.
    const svg = svgWith(`<g transform="translate(160,0)"><path d="M0 0L50 0"/></g>`, 200);
    const result = measureSvgBounds(svg);
    expect(result?.overflowPx).toBeCloseTo(10, 5);
  });

  it('applies <g transform="matrix(a,b,c,d,e,f)"> (e = x-offset, a = x-scale)', () => {
    // matrix(2,0,0,1,100,0): scale x by 2, translate x by 100.
    // Path raw max x = 60 → 60*2 + 100 = 220; canvas 200 → overflow 20.
    const svg = svgWith(`<g transform="matrix(2,0,0,1,100,0)"><path d="M0 0L60 0"/></g>`, 200);
    const result = measureSvgBounds(svg);
    expect(result?.overflowPx).toBeCloseTo(20, 5);
  });

  it("composes nested <g> transforms (CTM stack)", () => {
    // Outer translate(100,0) + inner translate(50,0) → +150; raw 30 → abs 180; canvas 200 → no overflow.
    const noOverflow = svgWith(
      `<g transform="translate(100,0)"><g transform="translate(50,0)"><path d="M0 0L30 0"/></g></g>`,
      200,
    );
    expect(measureSvgBounds(noOverflow)).toBeNull();

    // Same nesting but raw 80 → abs 230 → overflow 30.
    const withOverflow = svgWith(
      `<g transform="translate(100,0)"><g transform="translate(50,0)"><path d="M0 0L80 0"/></g></g>`,
      200,
    );
    expect(measureSvgBounds(withOverflow)?.overflowPx).toBeCloseTo(30, 5);
  });

  it("ignores content inside <mask> (not rasterized to canvas)", () => {
    // Mask contains a rect/path that LOOKS like overflow but masks aren't drawn.
    const svg = svgWith(`<mask id="m"><path d="M0 0L9999 0"/></mask><path d="M0 0L100 0"/>`, 200);
    expect(measureSvgBounds(svg)).toBeNull();
  });

  it("ignores content inside <clipPath>", () => {
    const svg = svgWith(
      `<clipPath id="c"><path d="M0 0L9999 0"/></clipPath><path d="M0 0L100 0"/>`,
      200,
    );
    expect(measureSvgBounds(svg)).toBeNull();
  });

  it("tracks current-point x through lowercase (relative) commands", () => {
    // m 100,0  → absolute (100,0)
    // l 150,0  → absolute (250,0); canvas 200 → overflow 50.
    const svg = svgWith(`<path d="m100 0l150 0"/>`, 200);
    expect(measureSvgBounds(svg)?.overflowPx).toBeCloseTo(50, 5);
  });

  it("samples cubic control points (curve overshoot beyond endpoint)", () => {
    // Cubic Bezier from (0,0) with control (250,0) (250,50) endpoint (50,50).
    // Endpoint x=50 wouldn't overflow, but control x=250 means the rendered
    // curve bulges past canvas width 200.
    const svg = svgWith(`<path d="M0 0C250 0 250 50 50 50"/>`, 200);
    const result = measureSvgBounds(svg);
    expect(result).not.toBeNull();
    expect(result?.overflowPx).toBeGreaterThan(0);
  });

  it("parses canvas width from viewBox when width attr is absent", () => {
    const svg = `<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L400 0"/></svg>`;
    expect(measureSvgBounds(svg)?.widthPx).toBe(300);
    expect(measureSvgBounds(svg)?.overflowPx).toBeCloseTo(100, 5);
  });

  it("returns null for SVGs whose width cannot be determined", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L9999 0"/></svg>`;
    expect(measureSvgBounds(svg)).toBeNull();
  });

  it("rounds overflowPx to an integer for stable warning payloads", () => {
    const svg = svgWith(`<path d="M0 0L250.7 0"/>`, 200);
    const result = measureSvgBounds(svg);
    expect(result?.overflowPx).toBe(51);
  });

  it('ignores content inside <g clip-path="url(...)"> (Satori encodes overflow:hidden this way)', () => {
    // Reproduces the false-positive flagged by codex on PR #10: Satori serializes
    // CSS `overflow: hidden` as an attribute on a <g>, not as a <clipPath> ancestor.
    // The BlockShell hash-title filler (`"# ".repeat(200)`) is intentionally clipped
    // by Satori, so its 3000+ px glyph run must not be reported as canvas overflow.
    const svg = svgWith(
      `<g clip-path="url(#cp1)"><path d="M0 0L3500 0"/></g><path d="M0 0L100 0"/>`,
      200,
    );
    expect(measureSvgBounds(svg)).toBeNull();
  });

  it('ignores content inside <g mask="url(...)"> (Satori\'s other overflow:hidden form)', () => {
    const svg = svgWith(
      `<g mask="url(#m1)"><path d="M0 0L3500 0"/></g><path d="M0 0L100 0"/>`,
      200,
    );
    expect(measureSvgBounds(svg)).toBeNull();
  });

  it("still detects overflow OUTSIDE a clipped subtree", () => {
    // The clip-path skip must not leak across sibling boundaries.
    const svg = svgWith(
      `<g clip-path="url(#cp1)"><path d="M0 0L3500 0"/></g><path d="M0 0L250 0"/>`,
      200,
    );
    expect(measureSvgBounds(svg)?.overflowPx).toBeCloseTo(50, 5);
  });

  it("tolerates the bug-report repro shape: dense glyph paths past canvas", () => {
    // Approximates Satori's output for the bug repro: many M/L glyph commands,
    // the last extending past canvas. No <g transform> wrapping.
    const glyphs = Array.from({ length: 50 }, (_, i) => `M${i * 12} 10L${i * 12 + 8} 10`).join(" ");
    const trailing = `M620 10L640 10`; // overflow past canvas 576.
    const svg = svgWith(`<path fill="black" d="${glyphs} ${trailing}"/>`, 576);
    const result = measureSvgBounds(svg);
    expect(result?.overflowPx).toBeCloseTo(64, 5);
  });
});
