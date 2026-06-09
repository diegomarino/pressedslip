# ADR-0019: /browser barrel — full re-export of registry + blocks + providers

**Status:** Accepted
**Date:** 2026-05-22 (resolved 2026-05-22 in commit 50b9ade)
**Supersedes:** ADR-0018 "Known follow-ups" → first item ("/browser does NOT yet re-export createRegistry or builtin block definitions")

## Context

ADR-0018 deferred re-exporting `createRegistry`, `defineBlock`, and the six builtin block factories from `/browser` because, at sp5 design time, importing them via the top-level barrel transitively pulled `@resvg/resvg-js` (Node native binding) into the browser bundle. The sp5 harness worked around this with an inline empty `Registry`.

Investigation post-sp5 confirmed: when re-exported DIRECTLY from their source modules (NOT through `src/index.ts`), the block factories and `createRegistry` do not transitively reach `@resvg/resvg-js`. The scripts/verify-browser-bundle.mjs gate enforces this property.

## Decision

`src/browser/index.ts` re-exports the full surface:

- `createRegistry`, `defineBlock`
- six builtin block factories (`keyValueBlock`, `kpiBlock`, `listBlock`, `qaPairBlock`, `quotationBlock`, `textCellBlock`)
- `compose`, `computeBriefingStatus`, `createMemoryCache`
- providers (`defineProvider`, `createFixturePoolProvider`, `createProviderRegistry`, `createStaticTextProvider`)
- All public types (`Composition`, `Slot`, `Cache`, `Rendering`, etc.)
- `render`, `BrowserRenderOptions` (sp5)

The scripts/verify-browser-bundle.mjs gate guarantees zero `node:*` transitive imports for both `dist/index.mjs` and `dist/browser/index.mjs`. Tree-shaking is preserved via `"sideEffects": false` in package.json — consumers who import only `render` from `/browser` do NOT pay for unused block factories.

## Consequences

- Browser consumers (including the sp6 playground at `apps/playground/`) construct meaningful compositions without inline workarounds.
- Sp7 API restructuring of any re-exported name will trigger a playground build failure — intentional per ADR-0006.
- ADR-0018's "Known follow-ups" first item is closed; this ADR is the source of truth for the `/browser` surface.
