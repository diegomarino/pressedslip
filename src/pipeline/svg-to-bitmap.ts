/**
 * @fileoverview SVG to RGBA bitmap conversion via @resvg/resvg-js, with system fonts disabled for determinism.
 */
import { Resvg } from "@resvg/resvg-js";

/**
 * Raw RGBA pixel output from resvg along with the actual rasterized dimensions,
 * which may differ from the requested width after fitting.
 */
export type RgbaResult = {
  rgba: Uint8Array;
  width: number;
  height: number;
};

/**
 * Rasterize an SVG string to RGBA pixels using resvg, fitting to `fitToWidth` pixels.
 * System fonts are disabled for deterministic output across environments.
 */
export function svgToRgba(svg: string, fitToWidth: number): RgbaResult {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: fitToWidth },
    font: { loadSystemFonts: false },
    // White background — printable thermal output is black-on-white. Without
    // this, satori SVGs that lack an explicit <rect fill="white"/> render with
    // RGBA(0,0,0,0) for empty regions; rgbaToOneBit reads the R channel only
    // (ignoring alpha) and flags every transparent pixel as black. Defense in
    // depth with composeTree's wrapper backgroundColor.
    background: "white",
  });
  const image = resvg.render();
  return {
    rgba: new Uint8Array(image.pixels),
    width: image.width,
    height: image.height,
  };
}
