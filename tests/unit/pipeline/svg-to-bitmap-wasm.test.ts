import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { svgToRgbaWasm } from "../../../src/pipeline/svg-to-bitmap-wasm.js";

const require = createRequire(import.meta.url);
const wasmBytes = readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm"));

const TRIVIAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>`;

describe("svgToRgbaWasm", () => {
  it("renders a trivial SVG to RGBA at the requested width", async () => {
    const result = await svgToRgbaWasm(TRIVIAL_SVG, 20, wasmBytes);
    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
    expect(result.rgba.byteLength).toBe(20 * 20 * 4);
  });

  it("caches wasm init across calls (smoke — both calls succeed)", async () => {
    const a = await svgToRgbaWasm(TRIVIAL_SVG, 10, wasmBytes);
    const b = await svgToRgbaWasm(TRIVIAL_SVG, 10, wasmBytes);
    expect(a.rgba).toEqual(b.rgba);
  });

  it("rejects when wasm binary is not provided", async () => {
    // @ts-expect-error — deliberately passing undefined to test runtime guard
    await expect(svgToRgbaWasm(TRIVIAL_SVG, 10, undefined)).rejects.toThrow();
  });
});
