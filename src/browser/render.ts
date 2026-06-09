/**
 * @fileoverview Browser-safe render() orchestration. Mirrors top-level
 * src/render.tsx but uses svgToRgbaWasm in place of the Node resvg-js step.
 * The caller MUST provide `wasm` in BrowserRenderOptions — there is no
 * environment sniffing. See ADR-0018 for bootstrapping patterns.
 *
 * Keep in sync with src/render.tsx (top-level Node path). ADR-0018's
 * byte-identical determinism gate (tests/integration/render-engine-parity)
 * catches most behavioral drift, but defaults and option-handling logic
 * are not exercised by the gate — those must be mirrored manually.
 */
import { noopLogger } from "../logger.js";
import { PAPER, resolveWidth } from "../paper.js";
import { composeTree } from "../pipeline/compose-tree.js";
import { rgbaToOneBit } from "../pipeline/one-bit.js";
import { encodeOneBitPng } from "../pipeline/png-encode.js";
import { renderReactToSvg } from "../pipeline/satori-to-svg.js";
import { svgToRgbaWasm, type WasmInput } from "../pipeline/svg-to-bitmap-wasm.js";
import { loadThemeFonts } from "../themes/load.js";
import type { PreparedTheme } from "../themes/types.js";
import type { Composition, Rendering, RenderOptions } from "../types.js";

/** Default: PAPER.thermal80 (576px), matching top-level render() and ESC/POS transport. */
const DEFAULT_WIDTH = PAPER.thermal80;
const DEFAULT_THRESHOLD = 128;

/**
 * Render options for the `/browser` subpath — extends the shared `RenderOptions` with a required wasm binary.
 *
 * @example
 * ```ts
 * import { builtinBlocks, createRegistry, render, type BrowserRenderOptions } from "pressedslip/browser";
 * import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
 *
 * const registry = createRegistry(builtinBlocks);
 * const options: BrowserRenderOptions = { registry, wasm: wasmUrl };
 * const result = await render(composition, options);
 * ```
 */
export interface BrowserRenderOptions extends RenderOptions {
  /** wasm binary or URL for the resvg-wasm SVG renderer; required in browser environments. */
  readonly wasm: WasmInput;
}

/**
 * Render a `Composition` to a 1-bit PNG `Uint8Array` using the wasm SVG renderer.
 *
 * Functionally equivalent to the top-level `render()`; ADR-0018 enforces
 * byte-identical output via the parity gate. Supply `theme` (preferred) OR
 * `fonts` (legacy). When `theme` is a `ThemeTemplate` it is resolved via
 * `loadThemeFonts` (async, CDN). When it is a `PreparedTheme` (already loaded)
 * the render is fully synchronous apart from satori/wasm. When neither is
 * supplied, satori uses whatever fonts the host environment provides.
 *
 * @param composition - The composed briefing to render.
 * @param options - Render options including the required `wasm` binary.
 * @returns A `Rendering` object containing the 1-bit PNG bytes, dimensions, and any failed blocks.
 *
 * @example
 * ```ts
 * import { builtinBlocks, createRegistry, render } from "pressedslip/browser";
 * import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
 *
 * const registry = createRegistry(builtinBlocks);
 * const rendering = await render(composition, { registry, wasm: wasmUrl });
 * console.log(rendering.bytes); // Uint8Array — 1-bit PNG
 * ```
 */
export async function render(
  composition: Composition,
  options: BrowserRenderOptions,
): Promise<Rendering> {
  const logger = options.logger ?? noopLogger;
  const widthPx = resolveWidth(options.width ?? DEFAULT_WIDTH, logger);
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const onUnknownType = options.onUnknownType ?? "warn";
  const onBlockError = options.onBlockError ?? "skip";

  // Resolve theme — codex F2: use explicit _kind discriminant, NOT duck-typing.
  const prepared: PreparedTheme | undefined =
    options.theme === undefined
      ? undefined
      : options.theme._kind === "prepared"
        ? options.theme
        : await loadThemeFonts(options.theme);

  const fonts = prepared?.fonts ?? options.fonts ?? [];

  const { element, failedBlocks } = composeTree(composition, {
    registry: options.registry,
    logger,
    onUnknownType,
    onBlockError,
    prepared,
  });

  const svg = await renderReactToSvg(element, {
    width: widthPx,
    fonts,
  });
  const { rgba, width, height } = await svgToRgbaWasm(svg, widthPx, options.wasm);
  const onebit = rgbaToOneBit(rgba, width, height, threshold);
  const bytes = encodeOneBitPng(onebit, width, height);

  return {
    bytes,
    format: "png-1bit",
    width,
    height,
    failedBlocks,
  };
}
