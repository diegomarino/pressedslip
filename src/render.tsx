/**
 * @fileoverview Top-level render() orchestration: composeTree → Satori → resvg → 1-bit threshold → PNG encoding.
 */
import { noopLogger } from "./logger.js";
import { PAPER, resolveDpi, resolveWidth } from "./paper.js";
import { composeTree } from "./pipeline/compose-tree.js";
import { rgbaToOneBit } from "./pipeline/one-bit.js";
import { encodeOneBitPng } from "./pipeline/png-encode.js";
import { renderReactToSvg } from "./pipeline/satori-to-svg.js";
import { svgToRgba } from "./pipeline/svg-to-bitmap.js";
import { loadThemeFonts } from "./themes/load.js";
import type { PreparedTheme } from "./themes/types.js";
import type { Composition, CompositionInput, Rendering, RenderOptions } from "./types.js";

/** Default: PAPER.thermal80 (576px) — printable area for an 80mm thermal printer @ 203dpi. */
const DEFAULT_WIDTH = PAPER.thermal80;
const DEFAULT_THRESHOLD = 128;

/**
 * Render a Composition to a 1-bit PNG buffer.
 *
 * Orchestrates the full pipeline: composeTree → Satori SVG → resvg RGBA →
 * 1-bit threshold → PNG encoding. All defaults match the thermal-80 profile
 * (576 px wide, threshold 128).
 *
 * Supply `theme` (preferred) OR `fonts` (legacy). When `theme` is a
 * ThemeTemplate it is resolved via `loadThemeFonts` (async, CDN). When it is
 * a PreparedTheme the render is synchronous apart from satori/resvg. When
 * neither is supplied, satori uses whatever fonts the host provides.
 *
 * @param composition - The composition to render: a `compose()` result or a
 *   hand-built `CompositionInput` (diagnostic fields optional).
 * @param options - Width, threshold, theme/fonts, registry, and error policies.
 * @returns A Rendering with a 1-bit PNG buffer, pixel dimensions, and any failed blocks.
 * @example
 * ```ts
 * import { render, compose, createRegistry, builtinBlocks, themes, loadThemeFonts } from "pressedslip";
 *
 * const registry = createRegistry(builtinBlocks);
 * const composition = await compose({ providers: {}, blocks: registry, date: "2026-01-15" });
 * const prepared = await loadThemeFonts(themes.default);
 * const { bytes, width, height } = await render(composition, { registry, theme: prepared });
 * ```
 */
export async function render(
  composition: CompositionInput,
  options: RenderOptions,
): Promise<Rendering> {
  // Normalize diagnostics before composeTree: block renderers may read them
  // via RenderContext.composition. Nullish coalescing (not spread defaults) —
  // an explicit `undefined` in the input must not survive normalization.
  const full: Composition = {
    ...composition,
    failedBlocks: composition.failedBlocks ?? [],
    providerOutcomes: composition.providerOutcomes ?? {},
    timing: composition.timing ?? { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
  };
  const logger = options.logger ?? noopLogger;
  const widthPx = resolveWidth(options.width ?? DEFAULT_WIDTH, logger);
  const dpi = resolveDpi(options.width ?? DEFAULT_WIDTH);
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

  const { element, failedBlocks } = composeTree(full, {
    registry: options.registry,
    logger,
    onUnknownType,
    onBlockError,
    prepared,
    width: widthPx,
    dpi,
  });

  const svg = await renderReactToSvg(element, {
    width: widthPx,
    fonts,
  });
  const { rgba, width, height } = svgToRgba(svg, widthPx);
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
