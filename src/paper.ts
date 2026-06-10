/**
 * @fileoverview PAPER preset constants and resolveWidth() function for converting mm/px width specs at 8-pixel alignment.
 */
import type { Logger, PaperPreset, WidthSpec } from "./types.js";

/**
 * Named paper-size presets for the render pipeline.
 *
 * Thermal entries (`thermal58`, `thermal80`, `thermal110`) are pixel-exact at
 * the printer's native DPI. ISO/Letter entries (`a4Portrait`, `a4Landscape`,
 * `letterPortrait`) are millimeter-based and converted at render time via
 * `resolveWidth`. Pass any entry as `RenderOptions.width`.
 *
 * @example
 * ```ts
 * import { PAPER, render, createRegistry, builtinBlocks } from "pressedslip";
 *
 * const registry = createRegistry(builtinBlocks);
 * // render at 58mm thermal width
 * // const { bytes } = await render(composition, { registry, width: PAPER.thermal58 });
 * ```
 */
export const PAPER = {
  /** 58mm thermal printer at 203 DPI; printable width is ~48mm (384px). */
  thermal58: {
    /** Printable width in pixels at native DPI. */
    px: 384,
    /** Physical roll width in millimeters. */
    paperWidthMm: 58,
    /** Hardware-imposed margin per side in pixels; informational only. */
    edgeMarginPxPerSide: 40,
    /** Printer native DPI. */
    nativeDpi: 203,
    /** Human-readable label for admin UIs. */
    description: "58mm thermal printer, ~48mm printable",
  },
  /** 80mm thermal printer at 203 DPI; printable width is ~72mm (576px). */
  thermal80: {
    /** Printable width in pixels at native DPI. */
    px: 576,
    /** Physical roll width in millimeters. */
    paperWidthMm: 80,
    /** Hardware-imposed margin per side in pixels; informational only. */
    edgeMarginPxPerSide: 32,
    /** Printer native DPI. */
    nativeDpi: 203,
    /** Human-readable label for admin UIs. */
    description: "80mm thermal printer, ~72mm printable",
  },
  /** 110mm thermal printer at 203 DPI; printable width is ~104mm (832px). */
  thermal110: {
    /** Printable width in pixels at native DPI. */
    px: 832,
    /** Physical roll width in millimeters. */
    paperWidthMm: 110,
    /** Hardware-imposed margin per side in pixels; informational only. */
    edgeMarginPxPerSide: 24,
    /** Printer native DPI. */
    nativeDpi: 203,
    /** Human-readable label for admin UIs. */
    description: "110mm thermal printer, ~104mm printable",
  },
  /** ISO A4 portrait; millimeter-based, converted to pixels at render time. */
  a4Portrait: {
    /** Physical sheet width in millimeters. */
    mm: 210,
    /** Human-readable label for admin UIs. */
    description: "ISO A4, portrait",
  },
  /** ISO A4 landscape; millimeter-based, converted to pixels at render time. */
  a4Landscape: {
    /** Physical sheet width in millimeters. */
    mm: 297,
    /** Human-readable label for admin UIs. */
    description: "ISO A4, landscape",
  },
  /** US Letter portrait; millimeter-based, converted to pixels at render time. */
  letterPortrait: {
    /** Physical sheet width in millimeters. */
    mm: 215.9,
    /** Human-readable label for admin UIs. */
    description: "US Letter, portrait",
  },
} as const satisfies Record<string, PaperPreset>;

const DEFAULT_DPI = 203;
const MM_PER_INCH = 25.4;

/**
 * Convert a WidthSpec to an integer pixel width, always a multiple of 8.
 * Throws RangeError for `px` values not divisible by 8. Logs a warn when `mm`
 * requires rounding up. The `logger` argument is required for the warning path.
 */
export function resolveWidth(spec: WidthSpec, logger: Logger): number {
  if ("px" in spec) {
    if (spec.px % 8 !== 0) {
      throw new RangeError(`RenderOptions.width.px must be divisible by 8 (got ${spec.px})`);
    }
    return spec.px;
  }
  const dpi = spec.dpi ?? DEFAULT_DPI;
  const exact = (spec.mm * dpi) / MM_PER_INCH;
  const rounded = Math.ceil(exact / 8) * 8;
  if (rounded !== Math.round(exact)) {
    logger.warn("Width rounded up to multiple of 8", {
      requested: Math.round(exact),
      actual: rounded,
      mm: spec.mm,
      dpi,
    });
  }
  return rounded;
}

/**
 * Resolve the effective DPI (dots per inch) for a width spec, used to expose
 * `RenderContext.dpi` so blocks can convert between pixels and physical
 * millimeters (`px = mm × dpi / 25.4`).
 *
 * Resolution order:
 *  1. An explicit `dpi` on a millimeter-based spec wins.
 *  2. A `PaperPreset`'s `nativeDpi` (present on every `PAPER.thermal*` entry).
 *  3. Otherwise `DEFAULT_DPI` (203) — the thermal-native fallback for a
 *     context-free pixel spec such as `{ px: 576 }`.
 *
 * @param spec - The same WidthSpec (or PaperPreset) passed to `resolveWidth`.
 * @returns The effective DPI in dots per inch.
 */
export function resolveDpi(spec: WidthSpec): number {
  if ("dpi" in spec && spec.dpi !== undefined) {
    return spec.dpi;
  }
  const nativeDpi = (spec as PaperPreset).nativeDpi;
  if (typeof nativeDpi === "number") {
    return nativeDpi;
  }
  return DEFAULT_DPI;
}
