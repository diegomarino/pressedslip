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

// CJS-interop guard. esbuild compiles `import satori from "satori"` to
// `__toESM(require("satori"), 1)` for the CJS bundle. Under Node >= 22.12,
// `require(esm)` returns satori's module namespace; __toESM then sets
// `target.default` to the *whole* namespace object instead of the inner
// function. The defensive unwrap below works in both module systems:
//   - ESM: `satori` is the function; `(satori as any).default` is undefined
//     and we fall back to `satori`.
//   - CJS: esbuild rewrites the `satori` binding to `satori.default` (the
//     namespace), so `(satori as any).default` reads `namespace.default`,
//     which is the actual function exported by satori.
// A dynamic `await import("satori")` would also work for CJS but Rollup/Vite
// downstream consumers (e.g. the playground) code-split on it, so we stay
// with a static import.
const satoriFn = ((satori as unknown as { default?: typeof satori }).default ??
  satori) as typeof satori;

/**
 * Convert a React element to an SVG string using Satori. Font weights are
 * coerced to Satori's accepted numeric literal union (100–900) via `as`.
 */
export async function renderReactToSvg(element: ReactElement, opts: SatoriOpts): Promise<string> {
  return satoriFn(element, {
    width: opts.width,
    fonts: opts.fonts.map((f) => ({
      name: f.name,
      data: f.data.buffer as ArrayBuffer,
      weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
      style: f.style,
    })),
  });
}
