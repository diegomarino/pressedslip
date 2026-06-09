/**
 * @fileoverview Public theme primitive type definitions.
 * See ADR-0021. Two-field registry: canonical roles + arbitrary custom IDs.
 * Explicit `_kind` discriminant on PreparedTheme for safe union narrowing.
 */
import type { LoadedFont } from "../types.js";

/** Alias for LoadedFont — the binary font representation used throughout themes. */
export type FontSpec = LoadedFont;

/** URL-based font specification used in ThemeTemplate registries. */
export type FontUrlSpec = {
  /** CSS font-family name to register the loaded font under. */
  family: string;
  /** Absolute URL of the font file (TTF or OTF) to fetch. */
  url: string;
  /** CSS numeric font weight (e.g. 400 for normal, 700 for bold). */
  weight: number;
  /** CSS font style; "normal" or "italic". */
  style: "normal" | "italic";
};

/** Canonical semantic font roles supported by every built-in theme. */
export type FontRole = "body" | "display" | "mono";

/**
 * Per-slot text-style declarations consumed by `applyTextStyle` and the
 * `BlockShell` body cascade. Block authors read these from `ctx.theme.textStyles`.
 *
 * Only CSS-natural-inheritable properties (`fontSize`, `fontFamily` via
 * `fontRole`, `fontWeight`, `fontStyle`, `color`, `lineHeight`) propagate from
 * `body` via the wrapper cascade. `textAlign`, `textTransform`, `rotate` must
 * be applied explicitly per-element via `applyTextStyle`.
 */
export type TextStyle = {
  /** Font role (e.g. "body", "display", "mono") or raw family name. */
  fontRole?: FontRole | string;
  /** Font size in pixels. */
  fontSize?: number;
  /** CSS numeric font weight. */
  fontWeight?: number;
  /** CSS font style. */
  fontStyle?: "normal" | "italic";
  /** CSS color string. */
  color?: string;
  /** Horizontal alignment; not propagated by body cascade. */
  textAlign?: "left" | "center" | "right";
  /** CSS line-height multiplier. */
  lineHeight?: number;
  /** CSS text-transform; not propagated by body cascade. */
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
  /** Rotation in degrees, applied as `transform: rotate(Ndeg)`. Practical use: 180 for hidden-answer pattern. Values outside {0,180} swap bbox dims in Satori. */
  rotate?: number;
};

/**
 * Named-slot text-style registry on `ShellTheme`. Six canonical slots cover
 * the common typographic roles in a daily-briefing context. `extras` is an
 * escape hatch for theme-specific slots that don't fit the canonical names.
 */
export type TextStyles = {
  /** Default body text. Cascades to all block content via `BlockShell`. */
  body?: TextStyle;
  /** Lead/quoted/featured text. */
  emphasis?: TextStyle;
  /** Large numeric or hero display text. */
  display?: TextStyle;
  /** Small caption / metadata text. */
  label?: TextStyle;
  /** Question-prompt text (riddle, trivia). */
  question?: TextStyle;
  /** Answer text (riddle hidden-answer pattern). */
  answer?: TextStyle;
  /**
   * Theme-specific named slots beyond the canonical six.
   *
   * Use when a field has no semantic match against `body`/`emphasis`/`display`/
   * `label`/`question`/`answer`. Block authors and theme providers must agree
   * on the key name.
   *
   * Conventional keys established so far:
   *   - `pronunciation` — phonetic guide (e.g. word-of-day IPA transcription).
   *
   * When the same `extras` key appears in 3+ blocks across the catalog,
   * consider promoting it to a canonical slot via a minor version bump.
   */
  extras?: Record<string, TextStyle>;
};

/** Visual options for section-title shells (block, hash, plain styles). */
export type ShellTheme = {
  /** Title strip visual style: 'block' fills the width, 'hash' uses # prefix, 'plain' is unstyled. */
  titleStyle: "block" | "hash" | "plain";
  /** Font role or family name used for title strip text. */
  titleFontRole?: FontRole | string;
  /** Font size in pixels for title strip text. */
  titleFontSize?: number;
  /** CSS numeric font weight for title strip text. */
  titleFontWeight?: number;
  /** Horizontal alignment for 'plain' title style text. */
  titleAlignment?: "left" | "right";
  /** Character used to fill the title strip in 'block' style. */
  titleFillChar?: string;
  /** Background color of the title strip (CSS color string). */
  titleBg?: string;
  /** Foreground color of the title strip text (CSS color string). */
  titleFg?: string;
  /** Content area padding preset applied below the title strip. */
  contentPadding?: "compact" | "normal" | "loose";
  /** Separator line thickness below the block content area. */
  separatorThickness?: "none" | "thin" | "thick";
  /** Color of the separator line (CSS color string). */
  separatorColor?: string;
  /**
   * Horizontal gap in pixels applied by `listBlock` between the bold `id`
   * prefix and the `value` text within a row.
   *
   * **Why this exists at the theme level:** Satori (and CSS flex in general)
   * collapses trailing whitespace inside flex children, so an in-content
   * separator-space approach (`<div>08:30 </div><div>Morning</div>`) renders
   * with the two cells fused. A metric-driven gap is the correct fix.
   *
   * **Implementation note:** internally applied as `paddingRight` on the bold
   * `id` div rather than CSS `gap` on the row's flex container. Satori applies
   * flex `gap` inconsistently when a sibling's value wraps to a second line —
   * some rows render with the gap, others fuse. `paddingRight` is box-model
   * and survives wrap. Public knob and units are unchanged.
   *
   * Default: 8 (one space-equivalent at body 16px).
   */
  listItemGap?: number;
  /**
   * Character rendered before each item in list-shaped block content.
   * Blocks rendering lists (e.g. today, on-this-day, reminders) read this
   * via `ctx.theme.listItemBullet` and prepend it (typically followed by a
   * space) to each item. Themes own this vocabulary token; blocks MUST NOT
   * hardcode bullet characters.
   *
   * Symmetric to `titleFillChar`: a single-character visual atom owned by
   * the theme, consumed by blocks without branching on theme identity.
   *
   * Default: "•" (U+2022 bullet). Built-in `monoTheme` overrides to "-"
   * for ASCII parity.
   */
  listItemBullet?: string;
  /** Per-slot text-style vocabulary. See `TextStyles` for slot semantics. */
  textStyles?: TextStyles;
};

/** Visual options for the briefing header (name, date, bottom rule). */
export type HeaderTheme = {
  /** Font role or family name used for the subject name in the header. */
  nameFontRole?: FontRole | string;
  /** Font size in pixels for the subject name text. */
  nameFontSize?: number;
  /** CSS numeric font weight for the subject name text. */
  nameFontWeight?: number;
  /** Font size in pixels for the date text. */
  dateFontSize?: number;
  /** CSS numeric font weight for the date text. */
  dateFontWeight?: number;
  /** Vertical padding in pixels around the header content. */
  padding?: number;
  /** Height in pixels of the bottom rule drawn below the header. */
  bottomRuleHeight?: number;
  /** Color of the bottom rule (CSS color string). */
  bottomRuleColor?: string;
};

/**
 * Consumer-authored theme definition. Contains URL registries (roleUrls +
 * extraUrls) that are lazily fetched by loadThemeFonts into a PreparedTheme.
 */
export type ThemeTemplate = {
  /** Discriminant tag for union narrowing; always "template" when present. */
  readonly _kind?: "template";
  /** Stable unique identifier for this theme. */
  id: string;
  /** Human-readable theme name shown in admin UIs and the playground. */
  label: string;
  /** URL registries for canonical font roles (body, display, mono). */
  roleUrls: Partial<Record<FontRole, FontUrlSpec[]>>;
  /** Additional named URL registries for custom font roles beyond the canonical three. */
  extraUrls?: Record<string, FontUrlSpec[]>;
  /** Shell (block title strip) visual configuration for this theme. */
  shell: ShellTheme;
  /** Header visual configuration for this theme. */
  header: HeaderTheme;
};

/**
 * Fully-resolved theme with binary font data. The `_kind: "prepared"` discriminant
 * enables safe union narrowing with explicit `_kind === "prepared"` checks in the render pipeline.
 */
export type PreparedTheme = {
  /** Discriminant tag; always "prepared"; use `_kind === "prepared"` for safe union narrowing. */
  readonly _kind: "prepared";
  /** Stable unique identifier matching the originating ThemeTemplate. */
  id: string;
  /** Human-readable theme name. */
  label: string;
  /** Flat array of all loaded font binaries, deduplicated by name+weight+style. */
  fonts: FontSpec[];
  /** Font role → loaded binary array map for role-based font lookup during render. */
  fontRoles: Record<string, FontSpec[]>;
  /** Fully-resolved shell theme with all defaults applied. */
  shell: Required<ShellTheme>;
  /** Fully-resolved header theme with all defaults applied. */
  header: Required<HeaderTheme>;
};

/** Union accepted by loadThemeFonts and render() — either raw template or already-prepared. */
export type ThemeInput = ThemeTemplate | PreparedTheme;

/** Pluggable font byte cache. Default: memoryFontCache. Node disk: nodeFontCache. */
export interface FontCache {
  /** Retrieve cached font bytes by key; returns undefined on cache miss. */
  get(key: string): Promise<Uint8Array | undefined>;
  /** Store font bytes under key for subsequent cache hits. */
  set(key: string, bytes: Uint8Array): Promise<void>;
}
