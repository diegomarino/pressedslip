/**
 * @fileoverview React element to SVG conversion via Satori, with font passthrough and weight type coercion.
 */
import type { ReactElement } from "react";
import satori from "satori";
import type { LoadedFont } from "../types.js";

/**
 * Options forwarded to Satori. `width` sets the SVG viewport in pixels;
 * `fonts` are the pre-loaded TTF/OTF assets required for text layout.
 */
export type SatoriOpts = {
  width: number;
  fonts: LoadedFont[];
};

/**
 * Convert a React element to an SVG string using Satori. Font weights are
 * coerced to Satori's accepted numeric literal union (100–900) via `as`.
 */
export async function renderReactToSvg(element: ReactElement, opts: SatoriOpts): Promise<string> {
  return satori(element, {
    width: opts.width,
    fonts: opts.fonts.map((f) => ({
      name: f.name,
      data: f.data.buffer as ArrayBuffer,
      weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
      style: f.style,
    })),
  });
}
