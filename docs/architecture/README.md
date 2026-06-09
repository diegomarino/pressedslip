# Architecture

Maintainer-facing reference. Each entity below gets a dedicated page covering its purpose, canonical diagram, invariants, ADR cross-references, and code anchors into `src/`.

## Entity → page mapping

- [Composition](./composition.md) — the top-level shape adopters compose.
- [Block](./block.md) — one builtin / custom block.
- [`defineBlock` API](./define-block.md) — how custom blocks are declared.
- [Theme](./theme.md) — the three builtin themes + how to write your own.
- [Provider](./provider.md) — async data fetchers with parallel + timeout + cache + fail-soft.
- [Registry](./registry.md) — block-definition container.
- [Transport](./transport.md) — ESC/POS, file, HTTP outputs.
- [Font loading](./font-loading.md) — lazy + cached + fetch-only.
- [Compose pipeline](./compose-pipeline.md) — provider outcomes → block tree.
- [Render pipeline](./render-pipeline.md) — composition → React → satori → SVG → resvg → PNG.
- [Versioning](./versioning.md) — package + envelope policy.
- [TSDoc style](./tsdoc-style.md) — annotation conventions.

ADRs live in [`../adrs/`](../adrs/). Architecture diagrams are inline Mermaid blocks in the pages below; rendered output examples live in [`../assets/visual-refs/`](../assets/visual-refs/).

---

The module map below is a supplemental source-oriented index.

## Module map

| Path | Role | Entry point? |
|---|---|---|
| `src/index.ts` | Package root barrel — re-exports all public API | Yes — `"pressedslip"` |
| `src/testing/index.ts` | `/testing` subpath barrel — aggregated builtin fixtures + per-shape re-exports | Yes — `"pressedslip/testing"` |
| `src/providers/index.ts` | `/providers` subpath barrel — provider factories incl. Node-only `createOpenMeteoProvider` and `createFileCache` | Yes — `"pressedslip/providers"` |
| `src/browser/index.ts` | `/browser` subpath barrel — strictly browser-safe surface; enforced by `scripts/verify-browser-bundle.mjs`. Exposes `render` + `BrowserRenderOptions`. | Yes — `"pressedslip/browser"` |
| `src/blocks/<name>.tsx` | One file per builtin shape: `text-cell`, `key-value`, `kpi`, `list`, `qa-pair`, `quotation`, `word-search`. Owns the `BlockDefinition`. | No (re-exported via root) |
| `src/blocks/<name>.fixtures.ts` | Sibling fixture data for each builtin shape (≥3 scenarios) | No (re-exported via `/testing`) |
| `src/define-block.ts` | `defineBlock<TData>()` factory (typed identity narrowing); accepts optional `dependencies` | No |
| `src/registry.ts` | `createRegistry()` — builds `type → BlockDefinition` lookup; accepts `readonly AnyBlockDefinition[]` | No |
| `src/render.ts` | `render(composition, options) → Rendering` — drives the Pipeline | No |
| `src/types.ts` | All public TypeScript types (excluded from coverage measurement per ADR-0016) | No |
| `src/fonts.ts` | `loadFontFromBuffer`, `loadFontFromUrl` — fetch-only (ADR-0017); zero `node:*` imports, browser-safe | No |
| `src/logger.ts` | `createConsoleLogger` (plus a no-op default used internally) | No |
| `src/paper.ts` | `PAPER` presets (thermal + ISO/Letter) | No |
| `src/shell/` | `BlockShell`, `ShellTop`, `ShellBottom` — internal shell decoration components | No |
| `src/pipeline/` | Internal pipeline stages: `composeTree`, `satoriToSvg`, `svgToBitmap`, `oneBit`, `pngEncode` | No |
| `src/pipeline/svg-to-bitmap-wasm.ts` | Browser-safe SVG→RGBA via `@resvg/resvg-wasm`. Caller provides the wasm binary (DI); module-cached `initPromise` amortizes wasm boot. Same contract as Node `svgToRgba`. | No |
| `src/browser/render.ts` | `/browser` `render(composition, options)` orchestration. Reuses pure pipeline steps + `svgToRgbaWasm`. `BrowserRenderOptions.wasm: WasmInput` required. Kept in sync with `src/render.tsx`. | No (re-exported via `/browser`) |
| `src/orchestrator/compose.ts` | `compose(options) → Promise<Composition>` — 8-step pipeline: validate → enable → deps → fetch → render → retain → status → assemble | No |
| `src/orchestrator/compute-status.ts` | `computeBriefingStatus(composition)` public helper + `_computeStatus` truth table (M7) | No |
| `src/orchestrator/cache.ts` | `Cache` / `ReadOnlyCache` interfaces + `createMemoryCache()` (default ephemeral) | No |
| `src/orchestrator/file-cache.ts` | `createFileCache({dir})` — disk-backed, atomic writes; **Node-only**, not in `/browser` | No |
| `src/orchestrator/{cache-key,prng,serializable-error,timeout}.ts` | Pure utilities: cache-key derivation, FNV-1a + mulberry32, Error projection (ADR-0014 alignment), timeout wrapper | No |
| `src/providers/{define-provider,registry,fixture-pool,static-text,open-meteo}.ts` | Provider primitives + 3 reference providers (open-meteo is Node-only) | No (re-exported via `/providers`) |
| `src/transports/index.ts` | `/transports` subpath barrel — `Transport` interface, three reference impls, `pngToEscPosRaster` helper, `PRINT_WIDTH_DOTS` / `PRINT_MAX_HEIGHT_DOTS` constants | Yes — `"pressedslip/transports"` |
| `src/transports/{constants,types}.ts` | Transport types (`Transport`, `TransportPayload`, `transportError`) + ESC/POS constants (576px width, 4096px max height, 10 MiB compressed cap, default timeouts) | No (re-exported via `/transports`) |
| `src/transports/escpos.ts` | Two-layer ESC/POS: pure `pngToEscPosRaster(png)` helper + thin `createEscPosTransport({host,port,...})` TCP transport (ACK-less by protocol) | No (re-exported via `/transports`) |
| `src/transports/file.ts` | `createFileTransport({path,mode?})` — `fs.writeFile` wrapper preserving native error codes | No (re-exported via `/transports`) |
| `src/transports/http.ts` | `createHttpTransport({url, headers?, allowedHosts?, timeoutMs?})` — POST via global `fetch`. Always-on http/https scheme guard, userinfo strip, opt-in `allowedHosts` origin match, once-per-process SSRF warning | No (re-exported via `/transports`) |
| `src/_internal/adapters/marplanner-envelope.ts` | Replay-only adapter `adaptToComposition(envelope, deps)`. NOT publicly exported; importable only from tests | No |
| `src/_internal/adapters/types.ts` | Internal types: `BriefingEnvelopeV1`, `ReplayFixture`, `FixtureSourceMeta`, bounded `INPUT_SOURCE_META_ALLOWED_FIELDS` (empty → fail-closed) | No |
| `scripts/dev-render.ts` | Local-only CLI previewer: renders block fixtures to PNG | No |
| `scripts/check-docs.mjs` | Enforces `@fileoverview` + JSDoc policy on `src/` per ADR-0015. Runs in `pnpm verify` and pre-commit. | No |
| `scripts/verify-browser-bundle.mjs` | Post-build gate: asserts both `dist/index.mjs` AND `dist/browser/index.mjs` have no `node:*` transitive imports (node:* builtin absence gate — does NOT certify top-level browser-safety, see header comment) | No |
| `scripts/verify-browser-harness.mjs` | Post-build gate: runs `pnpm --filter pressedslip-browser-harness build` and propagates exit code. Build failure means a `/browser` consumer's bundler would fail. | No |
| ~~`tests/browser-harness/`~~ | **Retired** — superseded by `apps/playground/` + Playwright runtime smoke. Moved to `.attic/` (gitignored). | — |
| `apps/playground/` | Vite 6 + React 19 interactive playground deployed to GitHub Pages. 3-column resizable editor (palette / builder + JSON / preview) consuming `/browser` `render()` directly. Synthesizes a `Composition` envelope from a `DraftSlot[]` + meta — bypasses `compose()` entirely. Per-theme font caching, JSON pane via CodeMirror 6 + @lezer/json path resolver + two-layer Zod linter, DnD via @dnd-kit with `DragOverlay` ghost. | No (workspace package, dev-only; NOT in npm tarball) |
| `apps/playground/tests/runtime-smoke.spec.ts` | Playwright runtime smoke — 4 assertions covering cold load, first-render wasm boot, mutation→smaller render, theme switch→bytes change. Runs against `vite preview` (production build artifact) via `pnpm verify`. | No (test-only) |
| `.github/workflows/playground-pages.yml` | GitHub Action — Pages-via-Actions deploy (no `gh-pages` branch). Triggers on push to main touching `apps/playground/**` or `src/**`. Pre-deploy gate: `pnpm verify` must pass (incl. Playwright smoke). | No (CI-only) |
| `scripts/lint-replay-fixtures.mjs` | Fixture schema linter — validates `tests/fixtures/replay/*.json` against the bounded `ReplayFixture` shape (fail-closed default on unknown `input.sourceMeta` fields). Runs in `pnpm verify` BEFORE tests | No |
| `scripts/verify-replay-harness.mjs` | CI gate — re-runs the replay harness file in isolation and propagates the exit code. Failure blocks merge | No |
| `tests/harness/{fixtures-loader,replay.test,resolve-path}.ts` | Replay harness runtime: load fixtures → adapt envelope → assert structural equivalence (slotCount, slotBlockTypes ordered, failedBlockTypes sorted, briefingStatus, optional contentChecks via dotted-path resolver) | No (test-only) |

## Key boundaries

- **Package root (`"pressedslip"`)** — single entry surface (ADR-0011). Root exports: `render`, `compose`, `computeBriefingStatus`, `defineProvider`, `createProviderRegistry`, `createMemoryCache`, the two browser-safe provider factories, and all public types.
- **`/providers` subpath** — provider primitives + reference providers + cache factories. Node-only `createOpenMeteoProvider` and `createFileCache` live here. Consumers can target this subpath when they need the Node features.
- **`/browser` subpath** — strict browser-safe surface. Exports `render(composition, { ..., wasm })` backed by `@resvg/resvg-wasm` with a caller-provided wasm binary (DI; no environment sniffing). Enforced mechanically by `scripts/verify-browser-bundle.mjs` (no `node:*` builtin imports transitively reachable from `dist/index.mjs` OR `dist/browser/index.mjs`) plus the byte-identical determinism gate in `tests/integration/render-engine-parity.test.ts`. Font loader is fetch-only per ADR-0017. NOTE: the gate does NOT certify top-level browser-safety — top-level still depends on `@resvg/resvg-js` (a native Node addon).
- **`/transports` subpath** — three reference transports (`createEscPosTransport`, `createFileTransport`, `createHttpTransport`) + `pngToEscPosRaster` helper + `PRINT_WIDTH_DOTS` / `PRINT_MAX_HEIGHT_DOTS` constants. Node-only by design; not covered by the browser-bundle gate. HTTP transport has always-on http/https scheme validation + opt-in `allowedHosts` origin matching. ESC/POS TCP is ACK-less; callers needing delivery confirmation must use application-level ACK.
- **Replay harness** — `tests/harness/` + 15 sanitized fixtures in `tests/fixtures/replay/` + `scripts/lint-replay-fixtures.mjs` + `scripts/verify-replay-harness.mjs`. Asserts structural equivalence (NOT pixel-byte parity). Fixture `expected` values currently tagged `verifiedAgainst: "reference-code"` and may be upgraded to `marplanner-production` by a future parity harness.
- **`/testing` subpath** — fixture data only. Documented as NOT covered by semver for scenario-key names (additions and renames may land in patch releases). Adding or removing a shape from `builtinFixtures` IS a breaking change.
- **Block colocation pattern** — each builtin shape is a pair `<name>.tsx` + `<name>.fixtures.ts` in `src/blocks/`. The `.tsx` owns the `BlockDefinition`; the `.fixtures.ts` owns scenario data and is re-exported through `/testing`. Tests live separately in `tests/unit/blocks/`.
- **Pipeline** — `Composition → JSX → Satori SVG → resvg PNG → 1-bit threshold → PNG bytes`. Not configurable; determinism is required.
- **Shape-boundary principle** — variations that introduce non-determinism or change layout grammar are new shapes; typographic variants (font size, alignment) live as optional schema fields. Canonical example: `textCell.fontSize` / `align`.
- **`scripts/`** — local tooling only. Excluded from the published package and from coverage measurement (ADR-0016).

## Deferred work

Future scope includes: marplanner `BriefingEnvelope` → `Composition` adapter (lives in marplanner, not in this package).

## ADRs

Architecture Decision Records live in [`../adrs/`](../adrs/). Start with
[ADR-0001](../adrs/0001-build-tool-tsdown.md) and follow the numeric sequence.
Key ADRs for understanding the architecture:

- **ADR-0009** Bounded-hybrid migration strategy.
- **ADR-0011** Public API shape — root-only entry.
- **ADR-0012** Block taxonomy — visual shapes only, no content sources.
- **ADR-0015** JSDoc enforcement via custom script.
- **ADR-0016** Test coverage thresholds (85/75/85/85).
- **ADR-0017** Font loader is fetch-only; `loadFontFromUrl` browser-safe.
- **ADR-0018** `/browser` render via `@resvg/resvg-wasm` with byte-identical determinism gate vs Node `@resvg/resvg-js`.
- **ADR-0019** `/browser` barrel full re-export — all public types, factories, and utilities are reachable from `"pressedslip/browser"`. Tree-shakeable per `"sideEffects": false`.
