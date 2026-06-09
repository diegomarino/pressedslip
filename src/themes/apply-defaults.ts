/**
 * @fileoverview Resolves theme.shell / theme.header against package defaults.
 * Used by loadThemeFonts so PreparedTheme has Required<...> fields downstream.
 * See ADR-0021 + ADR-0025.
 */
import type { HeaderTheme, ShellTheme, TextStyles } from "./types.js";

/**
 * Per-slot defaults for `ShellTheme.textStyles`. Values are pass-through
 * hardcodes. Themed consumers override these via `defineTheme`.
 *
 * Slot rationale:
 * - body(20): base reading size; emphasis inherits this via cascade.
 * - emphasis({}): consumers (list, quotation) declare identity intent (bold/italic);
 *   slot stays empty so themes own only nuance.
 * - display(36,1.1): matches kpi.value historical hardcodes.
 * - label(16): secondary text (attributions, KPI labels, block sub-labels).
 * - question/answer(20): matches body so qa-pair reads at the same weight.
 * See ADR-0025 for full rationale.
 */
export const TEXT_STYLES_DEFAULTS: Required<TextStyles> = {
  body: { fontSize: 20 },
  emphasis: {},
  display: { fontSize: 36, lineHeight: 1.1 },
  label: { fontSize: 16 },
  question: { fontSize: 20 },
  answer: { fontSize: 20 },
  extras: {},
};

/**
 * Deep-merge a partial `TextStyles` over `TEXT_STYLES_DEFAULTS` such that
 * every canonical slot is present after merging. **Do not replace with shallow
 * spread** — shallow spread would drop unmodified default slots (CRIT-2).
 */
function mergeTextStyles(input: TextStyles | undefined): Required<TextStyles> {
  const i = input ?? {};
  return {
    body: { ...TEXT_STYLES_DEFAULTS.body, ...(i.body ?? {}) },
    emphasis: { ...TEXT_STYLES_DEFAULTS.emphasis, ...(i.emphasis ?? {}) },
    display: { ...TEXT_STYLES_DEFAULTS.display, ...(i.display ?? {}) },
    label: { ...TEXT_STYLES_DEFAULTS.label, ...(i.label ?? {}) },
    question: { ...TEXT_STYLES_DEFAULTS.question, ...(i.question ?? {}) },
    answer: { ...TEXT_STYLES_DEFAULTS.answer, ...(i.answer ?? {}) },
    extras: { ...TEXT_STYLES_DEFAULTS.extras, ...(i.extras ?? {}) },
  };
}

/**
 * Package defaults for all optional ShellTheme fields.
 *
 * Spread-merge this with a consumer-supplied `ShellTheme` (or use
 * `applyShellDefaults`) to get a fully-resolved shell configuration.
 *
 * @example
 * ```ts
 * import { SHELL_DEFAULTS } from "pressedslip";
 *
 * console.log(SHELL_DEFAULTS.titleFontSize); // 24
 * ```
 */
export const SHELL_DEFAULTS: Required<ShellTheme> = {
  titleStyle: "block",
  titleFontRole: "display",
  titleFontSize: 24,
  titleFontWeight: 700,
  titleAlignment: "right",
  titleFillChar: "#",
  titleBg: "#000",
  titleFg: "#fff",
  contentPadding: "normal",
  separatorThickness: "thin",
  separatorColor: "#000",
  listItemGap: 8,
  listItemBullet: "•",
  textStyles: TEXT_STYLES_DEFAULTS,
};

/**
 * Package defaults for all optional HeaderTheme fields.
 *
 * Spread-merge this with a consumer-supplied `HeaderTheme` (or use
 * `applyHeaderDefaults`) to get a fully-resolved header configuration.
 *
 * @example
 * ```ts
 * import { HEADER_DEFAULTS } from "pressedslip";
 *
 * console.log(HEADER_DEFAULTS.nameFontSize); // 32
 * ```
 */
export const HEADER_DEFAULTS: Required<HeaderTheme> = {
  nameFontRole: "display",
  nameFontSize: 32,
  nameFontWeight: 700,
  dateFontSize: 16,
  dateFontWeight: 400,
  padding: 24,
  bottomRuleHeight: 4,
  bottomRuleColor: "#000",
};

/**
 * Merge a consumer ShellTheme over SHELL_DEFAULTS, returning a fully-resolved object.
 *
 * Top-level fields merge shallowly; `textStyles` merges per-slot via
 * `mergeTextStyles` so every slot is always present in the result.
 *
 * @param input - A partial or complete ShellTheme from a ThemeTemplate.
 * @returns A fully-resolved `Required<ShellTheme>` with every field populated.
 * @example
 * ```ts
 * import { applyShellDefaults } from "pressedslip";
 *
 * const shell = applyShellDefaults({ titleBg: "#222", titleFg: "#eee" });
 * console.log(shell.titleFontSize); // 24 (from SHELL_DEFAULTS)
 * ```
 */
export function applyShellDefaults(input: ShellTheme): Required<ShellTheme> {
  return {
    ...SHELL_DEFAULTS,
    ...input,
    textStyles: mergeTextStyles(input.textStyles),
  };
}

/**
 * Merge a consumer HeaderTheme over HEADER_DEFAULTS, returning a fully-resolved object.
 *
 * All undefined fields from `input` fall back to the corresponding value in
 * `HEADER_DEFAULTS`. The result is `Required<HeaderTheme>` — no optional fields remain.
 *
 * @param input - A partial or complete HeaderTheme from a ThemeTemplate.
 * @returns A fully-resolved `Required<HeaderTheme>` with every field populated.
 * @example
 * ```ts
 * import { applyHeaderDefaults } from "pressedslip";
 *
 * const header = applyHeaderDefaults({ nameFontSize: 28 });
 * console.log(header.dateFontSize); // 16 (from HEADER_DEFAULTS)
 * ```
 */
export function applyHeaderDefaults(input: HeaderTheme): Required<HeaderTheme> {
  return { ...HEADER_DEFAULTS, ...input };
}
