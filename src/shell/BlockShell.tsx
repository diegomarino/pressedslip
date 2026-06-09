/**
 * @fileoverview Per-block wrapper: optional title strip (3 styles —
 * block/hash/plain), padding, optional bottom separator. Reads from `theme`
 * prop (NOT React Context — satori does not run hooks). Per-block `options`
 * continue to override theme defaults.
 */
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { SHELL_DEFAULTS } from "../themes/apply-defaults.js";
import { resolveFontFamily } from "../themes/apply-text-style.js";
import type { ShellTheme, TextStyles } from "../themes/types.js";
import type { BlockShellOptions, LoadedFont } from "../types.js";

/** Props accepted by the BlockShell wrapper component. */
export type BlockShellProps = {
  title?: string;
  options?: BlockShellOptions;
  theme?: Required<ShellTheme>;
  /** Font-roles registry from PreparedTheme. Required to resolve
   *  theme.textStyles.body.fontRole to a CSS fontFamily. */
  fontRoles?: Record<string, LoadedFont[]>;
  children: ReactNode;
};

const SEPARATOR_HEIGHTS = { thin: 1, thick: 3, none: 0 } as const;
const PADDING_VERTICAL = { compact: 8, normal: 16, loose: 24 } as const;

/**
 * Module-level sentinel for the one-time body fontRole warning. Exported for
 * testability only — do not set externally.
 * @internal
 */
export let bodyFontRoleWarned = false;

/**
 * Derive CSS-natural-inheritable body styles from `textStyles.body`.
 * Only propagates: fontSize, fontWeight, fontStyle, color, lineHeight,
 * fontFamily (via fontRole). Does NOT propagate textAlign, textTransform,
 * or rotate — those must be applied explicitly per-element.
 */
function bodyCascade(
  textStyles: Required<TextStyles>,
  fontRoles: Record<string, LoadedFont[]> | undefined,
): CSSProperties {
  const body = textStyles.body;
  const style: CSSProperties = {};
  if (body.fontSize !== undefined) style.fontSize = body.fontSize;
  if (body.fontWeight !== undefined) style.fontWeight = body.fontWeight;
  if (body.fontStyle !== undefined) style.fontStyle = body.fontStyle;
  if (body.color !== undefined) style.color = body.color;
  if (body.lineHeight !== undefined) style.lineHeight = body.lineHeight;
  if (body.fontRole !== undefined) {
    if (fontRoles !== undefined) {
      const family = resolveFontFamily(body.fontRole, fontRoles);
      if (family !== undefined) style.fontFamily = family;
    } else if (!bodyFontRoleWarned && typeof console !== "undefined") {
      console.warn(
        `[pressedslip] BlockShell received a theme with body.fontRole='${body.fontRole}' but no fontRoles prop — font-family will not be applied. Pass fontRoles from preparedTheme.fontRoles.`,
      );
      bodyFontRoleWarned = true;
    }
  }
  return style;
}

/**
 * Wrap block content with optional inverted/hash/plain title strip,
 * configurable padding, and optional bottom separator. Theme defaults
 * resolve from `theme` prop; per-block `options` override.
 */
export function BlockShell({
  title,
  options,
  theme,
  fontRoles,
  children,
}: BlockShellProps): ReactElement {
  const t = theme ?? SHELL_DEFAULTS;
  const styles = (t.textStyles ?? SHELL_DEFAULTS.textStyles) as Required<TextStyles>;
  const showTitle = options?.showTitle === true && title !== undefined;
  const separator = options?.separator ?? t.separatorThickness;
  const padding = options?.padding ?? t.contentPadding;

  const sepHeight = SEPARATOR_HEIGHTS[separator];
  const padY = PADDING_VERTICAL[padding];

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {showTitle ? renderTitleStrip(title, t, fontRoles) : <div style={{ display: "flex" }} />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: `${padY}px 24px`,
          width: "100%",
          color: "black",
          ...bodyCascade(styles, fontRoles),
        }}
      >
        {children}
      </div>
      {sepHeight > 0 ? (
        <div
          style={{
            display: "flex",
            height: sepHeight,
            backgroundColor: t.separatorColor,
            width: "100%",
          }}
        >
          <div style={{ display: "flex" }} />
        </div>
      ) : (
        <div style={{ display: "flex" }} />
      )}
    </div>
  );
}

function renderTitleStrip(
  title: string,
  t: Required<ShellTheme>,
  fontRoles: Record<string, LoadedFont[]> | undefined,
): ReactElement {
  const fontFamily =
    t.titleFontRole !== undefined && fontRoles !== undefined
      ? resolveFontFamily(t.titleFontRole, fontRoles)
      : undefined;
  const fontSize = t.titleFontSize;
  const fontWeight = t.titleFontWeight;
  const alignment = t.titleAlignment;

  if (t.titleStyle === "hash") {
    const fillChar = t.titleFillChar || "#";
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          padding: "8px 24px",
          backgroundColor: "#fff",
          color: "#000",
          fontSize,
          fontWeight,
          ...(fontFamily !== undefined ? { fontFamily } : {}),
        }}
      >
        <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", color: "#000" }}>
          {`${fillChar} `.repeat(200)}
        </div>
        <div style={{ display: "flex", paddingLeft: "0.5em" }}>{title}</div>
      </div>
    );
  }
  if (t.titleStyle === "plain") {
    return (
      <div
        style={{
          display: "flex",
          padding: "8px 24px",
          width: "100%",
          backgroundColor: "#fff",
          color: "#000",
          justifyContent: alignment === "right" ? "flex-end" : "flex-start",
          fontSize,
          fontWeight,
          ...(fontFamily !== undefined ? { fontFamily } : {}),
        }}
      >
        <div style={{ display: "flex" }}>{title}</div>
      </div>
    );
  }
  // titleStyle === "block" (default style)
  return (
    <div
      style={{
        display: "flex",
        padding: "8px 24px",
        width: "100%",
        backgroundColor: t.titleBg,
        color: t.titleFg,
        justifyContent: alignment === "right" ? "flex-end" : "flex-start",
        fontSize,
        fontWeight,
        ...(fontFamily !== undefined ? { fontFamily } : {}),
      }}
    >
      <div style={{ display: "flex" }}>{title}</div>
    </div>
  );
}
