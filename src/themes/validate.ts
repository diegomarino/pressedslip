/**
 * @fileoverview Validates a `PreparedTheme` for consistency at prepare time.
 * Currently catches dangling `fontRole` references in `shell.textStyles`.
 *
 * This is the "loud failure" half of the unknown-fontRole policy. The render-
 * time helper `applyTextStyle` silently omits unknown roles so it never
 * crashes mid-render; this validator throws so bad themes are rejected before
 * any block is rendered.
 */
import type { PreparedTheme, TextStyle } from "./types.js";

/**
 * Throw if any `shell.textStyles` slot references a `fontRole` not present
 * in `prepared.fontRoles`. Called from `loadThemeFonts` after defaults are
 * applied but before the prepared theme is returned to callers.
 *
 * @param prepared - A fully-resolved `PreparedTheme` to validate.
 * @throws If any `shell.textStyles` slot references a `fontRole` not present in `prepared.fontRoles`.
 */
export function validateTheme(prepared: PreparedTheme): void {
  const known = new Set(Object.keys(prepared.fontRoles));
  const slots = prepared.shell.textStyles;
  const canonicalSlots: Array<[string, TextStyle | undefined]> = [
    ["body", slots.body],
    ["emphasis", slots.emphasis],
    ["display", slots.display],
    ["label", slots.label],
    ["question", slots.question],
    ["answer", slots.answer],
  ];
  const extraSlots: Array<[string, TextStyle]> = Object.entries(slots.extras ?? {}).map(
    ([name, style]) => [`extras.${name}`, style] as [string, TextStyle],
  );
  const checks: Array<[string, TextStyle]> = [
    ...canonicalSlots.filter((e): e is [string, TextStyle] => e[1] !== undefined),
    ...extraSlots,
  ];
  for (const [slotName, style] of checks) {
    if (style.fontRole === undefined) continue;
    if (!known.has(style.fontRole)) {
      throw new Error(
        `[pressedslip] validateTheme: slot '${slotName}' references unknown fontRole '${style.fontRole}'. Known roles: [${[...known].join(", ")}]`,
      );
    }
  }
}
