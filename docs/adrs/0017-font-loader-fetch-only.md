# ADR-0017 — Font loader is fetch-only

**Status:** Accepted (sp5)
**Date:** 2026-05-21
**Supersedes:** none
**Related:** ADR-0011 (public API shape), audit B3

## Context

Pre-sp5, `loadFontFromUrl` supported both `http(s)://` (via global `fetch`) and `file://` (via `readFile` + `fileURLToPath`). The `file://` branch required `node:fs/promises` and `node:url` imports in `src/fonts.ts`, which forced `scripts/verify-browser-bundle.mjs` to exclude `dist/index.mjs` from its `node:*` guard (sp4 §9 deferred item #6). Audit B3 flagged the loader as a barrier to a browser-safe top-level surface.

## Decision

`loadFontFromUrl(name, url, opts?)` accepts only `http(s)://` URLs. The function uses global `fetch` exclusively (Node 22+ or browser). Passing any other scheme propagates fetch's native `TypeError` — no special-case messaging.

For local files in Node, consumers must read bytes themselves and use `loadFontFromBuffer`:

```ts
import { readFile } from "node:fs/promises";
import { loadFontFromBuffer } from "pressedslip";

const buf = await readFile("/path/to/font.ttf");
const font = await loadFontFromBuffer("MyFont", new Uint8Array(buf));
```

No new public exports. No `loadFontFromFile` Node-only helper. The universal helper is browser-safe; file IO is the consumer's concern.

## Consequences

- `src/fonts.ts` becomes pure (no `node:*` imports). Both `loadFontFromBuffer` and `loadFontFromUrl` work in browser bundles.
- `scripts/verify-browser-bundle.mjs` can now include `dist/index.mjs` in its guarded entries (see ADR-0018 Decision 5).
- Breaking change for pre-sp5 consumers passing `file://`. Package is pre-1.0; no semver constraint. CHANGELOG documents the migration.
- Internal call-sites (`scripts/dev-render.ts`) already used `loadFontFromBuffer` + manual `readFile`, so no internal migration is needed.
- Test coverage: `tests/unit/fonts.test.ts` switches from filesystem-backed to undici MockAgent (see Decision 6 of the sp5 spec).
