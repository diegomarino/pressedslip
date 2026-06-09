# ADR-0020 — Shell theme adoption (BlockShell + ShellTop)

**Date:** 2026-05-22
**Status:** Accepted
**Supersedes:** none

## Context

The current `src/shell/BlockShell.tsx` ignores its own `separator` option entirely — the type defines it, the 6 builtin blocks all set `separator: "thin"`, but the renderer never produces an element for it. The title strip is also minimal (bold-text only, no background, no font choice). Compared with the marplanner reference (`packages/daily-briefing-render/src/receipt/BlockShell.tsx`), the visual rhythm of the receipt is much weaker: blocks bleed into each other, the title strip doesn't read as a section header, and the receipt has no obvious vertical hierarchy. The same gap applies to `src/shell/ShellTop.tsx`.

## Decision

Adopt marplanner's shell visuals for `BlockShell` and `ShellTop`. Specifically:

- **BlockShell title strip:** inverted (black background, white text), bold, asymmetric `8px 24px` padding, 24 px right-aligned (diverges from marplanner's 20 px left-aligned — see "Divergences" below).
- **BlockShell separator:** implement the dead-code option. Render a `1px` or `3px` full-width black bar for `"thin"` / `"thick"`, an empty placeholder div for `"none"`.
- **BlockShell padding values:** shift from `4 / 8 / 16` to `8 / 16 / 24`. Keep the names `compact / normal / loose` (no rename to `generous`).
- **BlockShell content area:** asymmetric `${padY}px 24px` (horizontal locked at 24).
- **ShellTop:** stacked column layout, 24 px padding, `subject.name` at 32 px bold, `date` at 16 px regular, 4 px black horizontal rule at bottom.

Add a new `titleFontFamily?: string` field to `BlockShellOptions` (default `"JetBrains Mono"`). Consumer is responsible for loading the font via `loadFontFromBuffer` / `loadFontFromUrl`; missing font falls back to satori's first loaded font.

## Divergences from marplanner

1. **Title strip size + alignment.** Marplanner: 20 px left-aligned. pressedslip: 24 px right-aligned. The strip reads as a section closer rather than a header; a slightly larger right-anchored label gives stronger vertical rhythm without crowding the 8 px vertical padding of the strip itself.
2. **`titleFontFamily` as a per-block option.** Marplanner hardcodes the font. Per-block configurability lets composition consumers select fonts without rewriting the shell — and avoids committing to a composition-level theme primitive prematurely. Composition themes are a sp7 concern.
3. **`padding` name kept as `loose`** (marplanner: `generous`). Parity is of capability, not nomenclature. Less churn; no breaking change.
4. **ShellBottom NOT adopted.** Marplanner's ShellBottom renders a `receiptId`. pressedslip has no equivalent field on `DraftComposition`. Adding one is a package surface change deferred to sp7 (sp6.5 spec out-of-scope item #1).

## Consequences

- The 6 builtin block definitions already specify `shell: { showTitle: true, separator: "thin", padding: "normal" }` — they pick up the new visual automatically without data change.
- The replay-harness (`tests/harness/replay.test.ts`) is structural — unaffected.
- The determinism gate (`tests/integration/render-engine-parity.test.ts`) compares Node vs Browser bytes — both paths use the new shell, equality holds.
- Bundle size impact: marginal (~+0.5 KB from the richer shell). Well within the 1.5 MB gate's 216 KB headroom.
- API surface: one additive optional field; backwards-compatible.

## Alternatives considered

- **Strict marplanner adoption (20 px left-aligned title).** Rejected: the divergence is a deliberate visual choice, not an accident; right-aligned reads as section-closer.
- **Composition-level theme primitive (`Theme` interface that drives shell visuals).** Rejected for sp6.6: pre-mature. Sp7 candidate when public API decisions land.
- **Rename `loose` to `generous` for marplanner naming parity.** Rejected: API churn without functional value; the value-set matters more than the identifier.
- **Include ShellBottom rewrite.** Rejected: requires a new `generatedAt` (or `receiptId`-equivalent) field on `DraftComposition`. Defer to sp7.
