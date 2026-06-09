# ADR-0024 — Marplanner adopts the "bring your own bytes" PreparedTheme pattern

**Date:** 2026-05-27
**Status:** Accepted

## Context

When adopting pressedslip in a Node environment with bundled fonts, Satori's font-matching algorithm prefers weight-exact over style-exact. A raw fonts array of `[Medium 500, Bold 700, Italic 400]` resolves CSS-default `400 normal` to the weight-equal Italic 400 entry, producing unexpected italic body text. Including an explicit Regular 400 normal entry prevents this — but passing raw font arrays directly to `render()` is error-prone and couples the consumer to internal font-matching details.

## Decision

Marplanner introduces a new workspace package `@marplanner/marplanner-theme` that constructs a `PreparedTheme` manually using pressedslip's public API:

- `defineTheme(...)` for the template
- `applyShellDefaults(...)` and `applyHeaderDefaults(...)` to fill optional fields
- `_kind: "prepared"` discriminant as documented in ADR-0021
- 4 bundled TTFs (Regular 400 normal, Medium 500 normal, Bold 700 normal, Italic 400 italic) loaded synchronously via `fs.readFileSync` on first call, cached thereafter

The render-bridge calls `render(composition, { registry, theme: prepareMarplannerTheme() })` instead of passing raw `fonts: [...]`.

## Consequences

**Italic-default bug fixed.** Satori now sees an explicit Regular 400 normal entry; CSS-default body text resolves to it.

**Two consumer patterns confirmed as first-class.**

| Pattern | Consumer scenario | Used by |
|---|---|---|
| `ThemeTemplate` + `loadThemeFonts` (URL fetch) | Browser, edge, published themes | Pressedslip playground, future packaged themes |
| `PreparedTheme` (bring your own bytes) | Node with bundled fonts and a zero-network render-time constraint | Marplanner |

Pressedslip's public type `ThemeInput = ThemeTemplate | PreparedTheme` makes both paths first-class without renderer-side branching. Marplanner's adoption proves the "bring your own bytes" branch in production.

## Build-script idempotency fix

During Task 11 verification the original build script `tsc && cp -r src/fonts/jetbrains-mono dist/fonts/jetbrains-mono` was found to be non-idempotent: POSIX `cp -r src dst` copies `src` INTO `dst` when `dst` already exists, producing a nested `dist/fonts/jetbrains-mono/jetbrains-mono/` on second-and-later builds. Fixed to `tsc && rm -rf dist/fonts && cp -r src/fonts dist/fonts`. Verified idempotent across 3 consecutive builds. Worth noting because Path B's font-loading in production reads `dist/fonts/jetbrains-mono/JetBrainsMono-*.ttf` — the nested duplicate would not break anything immediately but is a latent confusion source.

## Alternatives considered

- **Option A — pressedslip exposes a `prepareThemeFromBytes` helper.** Rejected: an exported helper would have the same per-consumer shape this design uses (4 file reads + applyDefaults), but couples consumers to a pressedslip release for what is really an assembly pattern. The "BYO bytes" pattern is more flexible left in consumer code.
- **Option B — use `loadThemeFonts(template, { fetch: customFetch })` with a file-URL fetcher.** Rejected: pressedslip's `loadThemeFonts` is fetch-only by ADR-0017; bending it to file-URL fetch reintroduces the network code path consumers want to avoid.
- **Option C (chosen) — manual PreparedTheme construction via public API.** No pressedslip changes required; consumer fully owns font loading; pattern documented in this ADR.

## References

- ADR-0021 — `PreparedTheme` discriminant (`_kind: "prepared"`)
- pressedslip theme API: `defineTheme`, `applyShellDefaults`, `applyHeaderDefaults`
