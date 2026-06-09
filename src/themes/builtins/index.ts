/**
 * @fileoverview Catalog of builtin themes shipped with the package.
 */
import type { ThemeTemplate } from "../types.js";
import { compactTheme } from "./compact.js";
import { defaultTheme } from "./default.js";
import { monoTheme } from "./mono.js";

/**
 * Registry of builtin themes shipped with the package.
 *
 * Each theme is a complete, pre-validated `ThemeTemplate` suitable for
 * immediate use with `loadThemeFonts`. Pass `themes.default` for a balanced
 * sans-serif layout, `themes.mono` for a monospaced technical look, or
 * `themes.compact` for dense information-heavy briefings.
 *
 * @example
 * ```ts
 * import { themes, loadThemeFonts, render, createRegistry, builtinBlocks } from "pressedslip";
 *
 * const prepared = await loadThemeFonts(themes.mono);
 * const registry = createRegistry(builtinBlocks);
 * // const { bytes } = await render(composition, { registry, theme: prepared });
 * ```
 */
export const themes: Readonly<{
  /** Balanced sans-serif layout suitable for most daily briefing use cases. */
  default: ThemeTemplate;
  /** Monospaced technical look optimized for dense data and code-adjacent content. */
  mono: ThemeTemplate;
  /** Dense information-heavy layout with reduced padding for maximum content per page. */
  compact: ThemeTemplate;
}> = {
  default: defaultTheme,
  mono: monoTheme,
  compact: compactTheme,
};
