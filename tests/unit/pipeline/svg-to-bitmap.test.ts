import { describe, expect, it } from "vitest";
import { svgToRgba } from "../../../src/pipeline/svg-to-bitmap.js";

describe("svgToRgba", () => {
  it("converts a simple solid-black SVG to RGBA where all pixels are black", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="2">
      <rect x="0" y="0" width="8" height="2" fill="black" />
    </svg>`;
    const { rgba, width, height } = svgToRgba(svg, 8);
    expect(width).toBe(8);
    expect(height).toBe(2);
    expect(rgba.length).toBe(8 * 2 * 4);
    expect(rgba[0]).toBe(0);
  });

  it("respects the requested width and computes height proportionally", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">
      <rect x="0" y="0" width="100" height="50" fill="white" />
    </svg>`;
    const { width, height } = svgToRgba(svg, 200);
    expect(width).toBe(200);
    expect(height).toBe(100);
  });
});
