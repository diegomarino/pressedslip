# ADR-0018 — `/browser` render via `@resvg/resvg-wasm` + byte-identical determinism gate

**Status:** Accepted (sp5)
**Date:** 2026-05-21
**Supersedes:** none
**Related:** ADR-0011 (public API shape), ADR-0014 (no silent failures), ADR-0017 (font loader fetch-only), audit §sp5

## Context

`render()` in the top-level barrel uses `@resvg/resvg-js` (a native Node addon). The `/browser` subpath requires a browser-callable `render()` without native binaries. Bringing your own SVG-rendering engine in the consumer code is hostile DX and would split the canonical rendering baseline.

The upstream `resvg` Rust crate guarantees pixel-identical output across platforms including WebAssembly:

> "If you render an SVG file on x86 Windows and then render it on ARM macOS, the produced image will be identical — each pixel will have the same value. This also extends to WebAssembly."
> — [linebender/resvg README](https://github.com/linebender/resvg)

That guarantee is the foundation for a byte-identical determinism gate between Node and browser render paths.

**Empirical confirmation:** the gate (`tests/integration/render-engine-parity.test.ts`) renders all six builtin block shapes via both engines and asserts `Buffer.equals` on the final 1-bit PNG. All six shapes PASS at the byte level on the first run with `@resvg/resvg-js@2.6.2` paired with `@resvg/resvg-wasm@2.6.2`. The Decision 4 fallback was NOT triggered; ADR-0019 was therefore not created.

## Decision

1. **Ship `render()` from `/browser`** backed by `@resvg/resvg-wasm`. Pinned to `^2.6.2` — same upstream release tag as `@resvg/resvg-js@^2.6.2`.
2. **Wasm binary is caller-provided (DI).** `BrowserRenderOptions.wasm: WasmInput` where `WasmInput = ArrayBufferView | ArrayBuffer | Response | Promise<Response>` — required field. The pipeline module `src/pipeline/svg-to-bitmap-wasm.ts` has zero `node:*` imports.
3. **Init is cached at module scope.** First call pays wasm boot cost (~50–200 ms); subsequent calls reuse the init promise. The cache resets on init failure so a subsequent call with a different binary may retry.
4. **Byte-identical determinism gate** (`tests/integration/render-engine-parity.test.ts`) renders six builtin shapes through both engines and asserts `Buffer.equals` on the final PNG. Runs as part of `pnpm test`; failure halts CI.
5. **`scripts/verify-browser-bundle.mjs` extends entries to `dist/index.mjs` + `dist/browser/index.mjs`.** The gate's purpose is reframed: it enforces ABSENCE OF `node:*` BUILTINS, not browser-safety of the top-level. `@resvg/resvg-js` is an allowed npm-package native addon for the top-level (it uses legacy `require('fs')` without the `node:` prefix).
6. **In-tree Vite browser harness** (`tests/browser-harness/`) builds via `pnpm --filter pressedslip-browser-harness build` and is wired into `pnpm verify` via `scripts/verify-browser-harness.mjs`. The harness is the canonical example of the Vite bootstrapping pattern documented below.

## Wasm bootstrapping patterns

### Node (test context, internal harness)

```ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const wasmBytes = readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm"));
const rendered = await render(composition, { ...rest, wasm: wasmBytes });
```

This `node:fs` use lives in test files / Node-only callers, NEVER in `src/`.

### Vite browser (browser harness, sp6 playground)

```ts
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
const rendered = await render(composition, { ...rest, wasm: fetch(wasmUrl) });
```

The `?url` suffix is Vite-native. Vite 5+ with minimal config emits the wasm asset as a separate chunk and resolves the `?url` import correctly. **No `vite-plugin-wasm` was needed.** If a future Vite version drops `?url` support, fall back to `vite-plugin-wasm` with `optimizeDeps.exclude: ["@resvg/resvg-wasm"]`.

### Other bundlers

Webpack: use `asset/resource` for `.wasm` files and pass the URL to `fetch()`. esbuild: use the `wasm` loader. Each bundler has its own asset-URL pattern; the API contract (`wasm` parameter) does not change.

## Determinism gate fallback (Decision 4)

If the byte-identical gate ever fails empirically in a future execution:

1. HALT execution.
2. Capture diagnostic evidence: which shape diverged, byte lengths, first diff offset, optionally a pixel-diff visualization (`pixelmatch` on the pre-encoding RGBA matrices).
3. Dispatch `codex-peer-review:codex-peer-reviewer` with the evidence.
4. Author ADR-0019 documenting the actual divergence and the new tolerance contract (pixel-diff threshold or pHash distance). Amend the sp5 spec with a "Determinism reality check" section.
5. `/browser` `render()` stays exported, JSDoc'd as "reference-equivalent within tolerance, not byte-identical."

This is a circuit breaker, not the expected path. Sp5 execution confirmed the upstream guarantee empirically — the fallback should remain dormant.

## Consequences

- `/browser` consumers gain a real `render()` they can call in any bundler that supports wasm assets.
- Single canonical baseline for sp8 parity harness — only the Node engine output needs comparison against marplanner fixtures, because `/browser` is byte-equal.
- ~2.48 MB wasm asset for browser consumers who import `/browser`. Top-level Node consumers are unaffected.
- First-call latency from wasm init is documented in the JSDoc on `BrowserRenderOptions.wasm`.
- DI wasm binary is more boilerplate than auto-detection, but trades zero magic for a clean Node-purity story.

## Verification

- Determinism gate: `tests/integration/render-engine-parity.test.ts` — 6/6 shapes byte-identical.
- Node-builtin absence gate: `scripts/verify-browser-bundle.mjs` — both `dist/index.mjs` and `dist/browser/index.mjs` clean.
- Vite build-success gate: `scripts/verify-browser-harness.mjs` — `pnpm --filter pressedslip-browser-harness build` exits 0 emitting `dist/index.html` + JS chunk + `.wasm` asset.
- All three gates run as part of `pnpm verify`.
