# ADR-0021 — Theme primitive (public API)

**Date:** 2026-05-24
**Status:** Accepted
**Sub-project:** sp7-prelude
**Supersedes:** Partial supersession of ADR-0020 (sp6.6 shell-theme adoption) for the title-strip portion. `BlockShellOptions.titleFontFamily` becomes a deprecated shorthand.

## Context

Sp6.6 introduced `BlockShellOptions.titleFontFamily?: string` as a stepping-stone toward themable shells. It worked but had three limitations:

1. Per-block (not per-composition / per-receipt).
2. String-typed (typo-prone, no autocomplete).
3. Limited to ONE knob (title family); could not coherently shift the receipt's chrome identity.

The playground had its own local themes (`apps/playground/src/themes/*`) duplicating concepts that should live in the package. No public theme contract existed for consumers.

## Decision

Ship a public theme primitive (`src/themes/`) that:

- **Controls ONLY the chrome** (BlockShell + ShellTop + font palette via Satori cascade). NOT block internals — block render functions remain theme-unaware. The "block voice" reframe.
- Declares **3 canonical font roles** (`body | display | mono`) with optional cascade fallback, each as `FontUrlSpec[]` for multi-weight. Allows **arbitrary custom IDs** via a separate `extraUrls` field (mixed registry; codex F3 split).
- Exposes **3 title-strip styles**: `"block"` (inverted bar), `"hash"` (text-on-white with fill chars), `"plain"` (text only).
- Ships **3 builtin themes**: `default` (Inter+block), `mono` (JBMono+hash), `compact` (Atkinson+plain+compact).
- Uses **explicit prop threading** (BlockShell/ShellTop receive `theme` props) NOT React Context — satori does not run hooks (codex F1).
- Implements **implicit lazy loading**: `render(comp, { theme: template })` works without consumer pre-loading. Advanced consumers can pre-load via `loadThemeFonts(template, options)`.
- Uses **PreparedTheme._kind = "prepared"** as runtime discriminant (codex F2) — no duck-typed `"fonts" in theme`.

## Folder layout divergence

`src/themes/builtins/` uses a subfolder while `src/blocks/*.tsx` keeps builtins flat (no subfolder). Intentional — themes share types, caches, load logic at sibling level; blocks are 6 leaf files with no shared infra beyond `src/types.ts` exports. Not refactoring blocks-to-subfolder is YAGNI; locking themes-as-flat would mix concerns.

## Node-only `nodeFontCache` packaging

`nodeFontCache()` requires `node:fs/promises` + `node:crypto` + `node:os` + `node:path`. Bundlers statically trace these at the static-import level even when lazy-imported inside function bodies. Re-exporting `nodeFontCache` from `src/themes/index.ts` (which is bundled into the default + browser entrypoints) caused the verify-browser-bundle gate to fail.

**Decision:** `nodeFontCache` is exported ONLY from `src/providers/index.ts` (Node-only subpath: `pressedslip/providers`). Consumers wanting Node disk caching write:

```ts
import { nodeFontCache } from "pressedslip/providers";
```

`memoryFontCache` remains in the main bundle (no Node dependencies).

## Font URL format

Satori requires TTF/OTF font binaries. WOFF2 was tried initially but fails silently at render time (Satori cannot parse). All 3 builtin themes ship TTF URLs (Google Fonts static + jsDelivr/@fontsource TTF variants). This is documented in docs/themes.md.

## Migration

- **Existing `BlockShellOptions.titleFontFamily`**: continues to work as an override. Emits `console.warn` deprecation once per session.
- **Playground**: deleted `apps/playground/src/themes/` and `apps/playground/public/fonts/`. Imports `themes` from the package. localStorage `themeId` key transparent — new theme IDs are identical to old `ThemeId` union.
- **Pre-existing consumers** (none external yet — package is sp7-prelude pre-publish): `render(comp, { fonts })` legacy path remains.

## Consequences

- Public API surface grows by ~10 type exports + 6 function/value exports.
- Bundle size: small increase (~3-5 KB) for the cache + load + apply-defaults code in the package; substantial DECREASE in playground bundle (no bundled fonts; ~424 KB lighter deployable).
- Codex F4 baseline PNG fixture committed at TFix BEFORE the refactor — anchors the "default theme byte-identical to sp6.6" regression assertion. Regression test passes in T4.
- ADR-0020's "title strip is inverted black bar" claim is now ONE of three options (block/hash/plain). ADR-0020 remains accurate for the `default` theme; this ADR documents the wider option space.

## Alternatives considered

- **React Context for theme propagation**: rejected; satori does not mount React hooks.
- **Block-internal theme tokens**: rejected; block voice is intentional, not theme-controllable. Forking via `defineBlock` is the path.
- **Bundled fonts in package**: rejected for bundle size + license + version coupling. Templates ship CDN URLs; caching handles persistence.
- **Single-string `titleFontFamily` evolved without breaking changes**: rejected as the single knob couldn't express the multi-dimensional theme contract.
- **WOFF2 CDN URLs**: rejected at integration time — Satori does not parse WOFF2.

## References

- Codex adversarial review: 12 findings folded (BLOCKING: F1, F2; SHOULD-FIX: F3-F7; NITs: F8-F12).
- Sp6.6 ADR: `docs/adrs/0020-shell-theme-adoption.md`.
