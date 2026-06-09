/**
 * @fileoverview Public theme primitive entrypoint.
 * Re-exports types + utilities + builtins (populated in T2 and T3).
 */

export {
  applyHeaderDefaults,
  applyShellDefaults,
  HEADER_DEFAULTS,
  SHELL_DEFAULTS,
  TEXT_STYLES_DEFAULTS,
} from "./apply-defaults.js";

export { applyTextStyle, resolveFontFamily } from "./apply-text-style.js";

export { memoryFontCache } from "./cache.js";
// NOTE: nodeFontCache is Node-only — import from `pressedslip/providers`.
// Re-exporting it here would pull node:* into the browser-safe bundle
// (verify-browser-bundle.mjs gate). See src/providers/index.ts.
export type {
  FontCache,
  FontRole,
  FontUrlSpec,
  HeaderTheme,
  PreparedTheme,
  ShellTheme,
  TextStyle,
  TextStyles,
  ThemeInput,
  ThemeTemplate,
} from "./types.js";

/**
 * Define a typed ThemeTemplate literal, preserving the exact inferred type.
 *
 * Identity helper — returns `t` unchanged. Its value is in the generic
 * constraint: without `defineTheme`, TypeScript widens object literals to
 * `ThemeTemplate`, losing the narrowed `id` and `roleUrls` key types that
 * the theme system relies on for type-checked lookups.
 *
 * @param t - A ThemeTemplate object literal to narrow.
 * @returns The same value as `t`, with its exact literal type preserved.
 * @example
 * ```ts
 * import { defineTheme } from "pressedslip";
 *
 * const myTheme = defineTheme({
 *   id: "my-theme",
 *   label: "My Theme",
 *   roleUrls: { body: [{ family: "Inter", weight: 400, style: "normal", url: "https://example.com/inter.ttf" }] },
 *   shell: {},
 *   header: {},
 * });
 * ```
 */
export function defineTheme<T extends import("./types.js").ThemeTemplate>(t: T): T {
  return t;
}

export { themes } from "./builtins/index.js";
export { type LoadThemeFontsOptions, loadThemeFonts } from "./load.js";
export { validateTheme } from "./validate.js";
