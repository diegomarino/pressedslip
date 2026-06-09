/**
 * @fileoverview Translates a `TextStyle` into the matching React `CSSProperties`.
 * Resolves `fontRole` against the `fontRoles` registry from a `PreparedTheme`.
 *
 * Behavior contract (see ADR-0025):
 * - `undefined` input → `{}`
 * - Undefined fields are omitted from output (never written as `undefined`).
 * - `rotate: N` → `transform: "rotate(Ndeg)"`.
 * - Unknown `fontRole` silently omits `fontFamily`. The loud failure happens
 *   at theme-prepare time via `validateTheme`.
 */
import type { CSSProperties } from "react";
import type { LoadedFont } from "../types.js";
import type { TextStyle } from "./types.js";

/**
 * Resolve a font-role name to its CSS `fontFamily` string by looking up the
 * first loaded entry. All entries in `fontRoles[role]` share the same `.name`
 * (family) — they differ only by weight/style — so returning index `[0]` is
 * sufficient (see `src/themes/load.ts:88-93`).
 */
export function resolveFontFamily(
  role: string,
  fontRoles: Record<string, LoadedFont[]>,
): string | undefined {
  const entries = fontRoles[role];
  if (entries === undefined || entries.length === 0) return undefined;
  return entries[0]?.name;
}

/**
 * Translate a `TextStyle` declaration into the matching `CSSProperties`.
 * See file header for the behavior contract.
 *
 * @param style - The `TextStyle` to translate. `undefined` returns `{}`.
 * @param fontRoles - Loaded-fonts registry from `PreparedTheme.fontRoles`.
 *   Pass `{}` to disable `fontRole` resolution.
 * @returns React-compatible `CSSProperties` ready to spread into a JSX `style`.
 */
export function applyTextStyle(
  style: TextStyle | undefined,
  fontRoles: Record<string, LoadedFont[]>,
): CSSProperties {
  if (style === undefined) return {};
  const out: CSSProperties = {};
  if (style.fontSize !== undefined) out.fontSize = style.fontSize;
  if (style.fontWeight !== undefined) out.fontWeight = style.fontWeight;
  if (style.fontStyle !== undefined) out.fontStyle = style.fontStyle;
  if (style.color !== undefined) out.color = style.color;
  if (style.textAlign !== undefined) out.textAlign = style.textAlign;
  if (style.lineHeight !== undefined) out.lineHeight = style.lineHeight;
  if (style.textTransform !== undefined) out.textTransform = style.textTransform;
  if (style.rotate !== undefined) out.transform = `rotate(${style.rotate}deg)`;
  if (style.fontRole !== undefined) {
    const family = resolveFontFamily(style.fontRole, fontRoles);
    if (family !== undefined) out.fontFamily = family;
  }
  return out;
}
