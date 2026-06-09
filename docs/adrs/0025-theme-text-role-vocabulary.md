# ADR-0025 — Theme text-role vocabulary (`textStyles` slots + cascade)

**Date:** 2026-05-28
**Status:** Accepted

## Context

The theme API had a gap: pressedslip's `ShellTheme` had no way to express body-text size, weight, or role at the theme level. Block authors hardcoded `fontSize: 18` inside their own JSX.

This gap is closed with a named-slot text-style vocabulary on `ShellTheme`, a body-cascade in `BlockShell`, and an `applyTextStyle` helper for non-body slots. The challenge: Satori does not run React hooks, so a `useTheme()` Context approach is not viable. Theme state has to reach blocks via either inline-style cascade (for inheritable properties) or prop-drilling through `RenderContext` (for everything else).

## Decision

### Six canonical slots + `extras` escape hatch

`ShellTheme.textStyles` exposes six named slots:

| Slot | Purpose |
|---|---|
| `body` | Default body text. Cascades to all block content via `BlockShell` wrapper. |
| `emphasis` | Lead, quoted, or featured text (e.g. `quote-of-day` body). |
| `display` | Large numeric or hero display text (e.g. `streak` number, `kpi` value). |
| `label` | Small caption / metadata text. |
| `question` | Question-prompt text (riddle, trivia). |
| `answer` | Answer text (riddle hidden-answer pattern, may carry `rotate: 180`). |

Plus `extras: Record<string, TextStyle>` as an escape hatch for theme-specific slots that don't fit the canonical six. Pattern mirrors the existing `FontRole` + `extraUrls` convention in `ThemeTemplate`.

### Cascade mechanism — wrapper for `body`, prop-drill for the rest

`BlockShell` injects a `style={{ ...bodyCascade(textStyles.body, fontRoles) }}` on its content `<div>`. CSS-natural-inheritable properties (`fontSize`, `fontFamily` via `fontRole`, `fontWeight`, `fontStyle`, `color`, `lineHeight`) propagate to block JSX without any block-author action. Non-inheritable properties (`textAlign`, `textTransform`, `transform: rotate(Ndeg)`) intentionally **do not** cascade — they must be applied per-element via `applyTextStyle(ctx.theme.textStyles.X, ctx.fontRoles)`.

For non-body slots, `RenderContext` carries `theme: Required<ShellTheme>` and `fontRoles: Record<string, LoadedFont[]>`. Blocks read `ctx.theme.textStyles.emphasis` (etc.) explicitly. This is the only path that works under Satori's no-hooks constraint.

### Two-tier safety on unknown `fontRole`

`applyTextStyle` silently omits `fontFamily` when a slot references an unknown `fontRole`. This is the render-time half: it never crashes mid-render, never produces an undefined CSS property, and never blocks a theme upgrade that arrives before a font registration.

`validateTheme` throws at prepare time (`loadThemeFonts` calls it before returning the `PreparedTheme`) with a clear message naming the slot and the unknown role. This is the loud half: bad themes are rejected before any block renders. Together they form the policy: **loud at prepare time, silent at render time**.

### Per-slot deep-merge for defaults (CRIT-2)

`applyShellDefaults` performs a per-slot deep-merge for `textStyles` (NOT a shallow spread). A consumer supplying `{ textStyles: { body: { fontWeight: 700 } } }` gets a result that preserves the other five canonical slot defaults *and* deep-merges the body-slot fields. Shallow spread would obliterate the unmodified slot defaults, breaking the slot-presence contract block authors rely on.

### `body.fontSize` package default = 16; marplanner-theme = 20

`TEXT_STYLES_DEFAULTS.body.fontSize` is `16`. Marplanner-theme template sets `body.fontSize: 20`. The 4px gap is **deliberate**:

- **16** is the package-level conservative-legibility floor for an unthemed `render()` call (no `theme` option passed). Confirmed empirically during execution: this matches Satori's implicit fontSize default, so the byte-identical regression baseline stays unchanged after sp8b (Risk #1 in spec § 326 resolved in the "no-op" branch).
- **20** is the project-wide standard for themed daily-briefing output, set by the marplanner-theme template and applied to all 17 ported blocks via the body cascade.

The split makes the unthemed case minimally invasive (zero byte change for existing baseline consumers) while letting themes set the agreed typographic standard explicitly. Documented at the constant in `src/themes/apply-defaults.ts:TEXT_STYLES_DEFAULTS` so a future contributor changing it has to read the rationale next to the value.

This narrative was added during execution after the inconsistency surfaced at the visual gate (Task 8); the spec table at line 34 set 16 as a placeholder, and peer-review at spec time did not challenge the number. It is captured here so the reasoning is not lost.

## Decision tree for block authors

```
Block needs to render text.
├── Body text only? (no special slot semantics)
│   → Do nothing. Body cascade injects fontSize, fontFamily, color, etc.
│
├── Specific slot? (emphasis, display, label, question, answer, extras.X)
│   → const style = applyTextStyle(
│       ctx.theme.textStyles.{slot},
│       ctx.fontRoles
│     );
│     <span style={style}>...</span>
│
├── Need rotate?
│   → rotate ∈ {0, 180}: safe — Satori bbox shape unchanged.
│   → rotate ∈ {90, 270}: requires explicit width/height on the rotated element
│     because Satori uses pre-rotation dimensions for flex layout. Themes using
│     these values without per-element sizing will break block layout.
│   → other angles: same constraint as 90/270; verify visually.
│
└── fontRole references an unknown role?
    → Theme is broken. validateTheme throws at prepare time naming the slot.
      Fix the theme; don't try to silence the error.
```

## Consequences

**Block authors get semantic vocabulary.** No more `fontSize: 18` literals scattered across block JSX.

**CRIT-2 deep-merge contract maintained.** Partial `textStyles` input preserves all six canonical slot defaults. Tested in `src/themes/__tests__/apply-defaults.test.ts`.

**IMP-6 silent-fallback safeguard.** `BlockShell` emits a one-time `console.warn` when a theme sets `body.fontRole` but the consumer omitted the `fontRoles` prop. Catches the intermediate state (pressedslip merged, consumer not yet wired) loudly. Tested in `src/shell/__tests__/BlockShell.test.tsx` using `vi.isolateModulesAsync` to reset the one-shot flag.

**Byte-identical regression baseline unchanged.** Empirically confirmed: the body cascade injecting `font-size:16` produces byte-identical output to Satori's implicit default. `src/__tests__/regression/baseline.test.ts` passes unchanged.

## Alternatives considered

- **React Context (`useTheme()` hook).** Rejected — Satori does not run React hooks; `useTheme()` would return `undefined` for every block. Not viable in this pipeline.
- **Single `body` cascade only (no `applyTextStyle`, no non-body slots).** Rejected — would not address the `riddle.answer rotate:180` case (rotate is not CSS-inheritable), nor the `streak.display 36px` case, nor the `quote-of-day.emphasis 24px` case. The cascade-only design covers maybe 60% of real block typography needs; the slot vocabulary covers the rest cleanly.
- **Accepting full `PreparedTheme` as `BlockShell` prop.** Rejected — breaking change for every existing consumer of `BlockShell`. The narrow `theme` + `fontRoles` props keep the prop surface small and the cascade scope explicit.
- **Bump package `body.fontSize` default to 20 (match marplanner-theme).** Rejected during execution — would force every unthemed render to grow body text by 4px, breaking the byte-identical regression baseline for no consumer benefit. The unthemed-vs-themed split is a feature, not a bug.

## References

- ADR-0021 — `PreparedTheme` discriminant pattern.
- ADR-0024 — Marplanner BYO-bytes pattern; surfaced the theme-API gap closed here.
- **Satori implicit fontSize default:** Empirically validated to be 16px; informs theme defaults and baseline regression testing.
