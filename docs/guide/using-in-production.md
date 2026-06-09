# Using pressedslip in production

This guide is for production-team developers evaluating whether `pressedslip` is ready for company use. It covers license, version stability, security, performance, and observability.

---

## License

`pressedslip` is distributed under the **MIT License** (see [LICENSE](../../LICENSE)).

The package bundles test fixtures that include **JetBrains Mono Regular**, licensed under the **SIL Open Font License 1.1** ([OFL-1.1](https://scripts.sil.org/cms/scripts/page.php?item_id=OFL)). This font is used in tests only and does not ship in the npm distribution (see `package.json#files`).

---

## Semantic versioning posture

`pressedslip` is currently prepared as **v0.1.0** and remains pre-1.0. Treat
minor versions as potentially breaking until `1.0.0`.

### Pre-1.0 policy

The package follows a strict pre-1.0 convention:

| Change type | Version bump | Example |
|---|---|---|
| Breaking public API | MINOR | `v0.1.x → v0.2.0` |
| Additive (new export, new block type, new option) | PATCH | `v0.1.0 → v0.1.1` |
| Bug fix, docs, internal refactor | PATCH | `v0.1.1 → v0.1.2` |

This mirrors the convention of widely-deployed pre-1.0 libraries (drizzle-orm, hono, viem).

### Pinning recommendation (pre-1.0)

Use the **tilde range** to accept patches only, blocking breaking changes:

```jsonc
{
  "dependencies": {
    "pressedslip": "~0.1.0"  // >=0.1.0 <0.2.0
  }
}
```

Do not use caret (`^0.1.0`) expecting the usual semver behavior — npm's 0.x special-casing makes both `^` and `~` equivalent for this package, and `~` makes your intent explicit.

### Upgrade workflow

Before upgrading to a new version:

1. Check the [CHANGELOG.md](../../CHANGELOG.md) entry for the target version.
2. If the **MINOR** bumped (e.g., `0.1.x → 0.2.0`), review all call sites using the public API — treat it as breaking.
3. If only **PATCH** bumped, the upgrade is safe to apply directly.

For full versioning policy, including `BriefingEnvelope.version` (the stored-payload schema — bumped independently from the package version whenever older code can no longer render a stored composition without transformation), see [docs/architecture/versioning.md](../architecture/versioning.md).

### Timeline to v1.0.0

v1.0.0 is planned for a future release once the public API stabilizes. At that
point, caret pinning (`^1.0.0`) becomes safe for additive-only releases.

---

## Security posture

### Release gates

The CI workflow (`.github/workflows/ci.yml`) runs on every PR:

```bash
pnpm lint              # Biome formatting and lint rules
pnpm build             # ESM/CJS package output
pnpm typecheck         # TypeScript public surface
pnpm test              # Unit and integration tests
pnpm check-docs        # Markdown links, anchors, and doc conventions
pnpm check-public-docs # Stale public examples and removed diagram artifacts
pnpm docs:api          # TypeDoc API reference generation
pnpm dlx publint          # Packaging correctness
pnpm dlx @arethetypeswrong/cli --pack .  # TypeScript export integrity
```

Run `pnpm audit --prod` against your application lockfile as part of your own
release process; runtime risk depends on the exact dependency graph you ship.

### Supply chain

- **Minimal dependencies:** five runtime dependencies (resvg-js, resvg-wasm, fast-png, jsonc-parser, satori).
- **Peer dependencies:** react@^19, zod@^4 — consumable from your own lockfile.
- **No pre-install scripts** (`prepare` hook runs husky only, not in published tarballs).
- **Lockfile:** pnpm-lock.yaml checked into git; use `pnpm install --frozen-lockfile` in CI.

### Vulnerability reporting

Report security issues via GitHub **Private Security Advisory** at <https://github.com/diegomarino/pressedslip/security/advisories>.

---

## Bundle size

The package itself ships zero transpilation overhead and minimal footprint:

| Entry point | Dist format | Scope |
|---|---|---|
| `pressedslip` | ESM + CJS | Render core, registry, built-in block types, providers |
| `pressedslip/browser` | ESM + CJS | Browser-specific render path (resvg-wasm) + re-exports from root |
| `pressedslip/providers` | ESM + CJS | Data fetcher plugins (async lifecycle, timeouts, cache) |
| `pressedslip/testing` | ESM + CJS | Structural assertion helpers (replaces snapshot-based tests) |
| `pressedslip/transports` | ESM + CJS | ESC/POS + file + HTTP renderers |

All exports declare `"sideEffects": false` and are tree-shakeable.

### Playground bundle size gate

The interactive playground (`apps/playground/`, workspace-only, not shipped) enforces a bundle-size budget via CI gate:

- **Threshold:** 1.5 MB raw (uncompressed) main JS chunk.
- **Current baseline:** ~1.3 MB (includes React 19 + CodeMirror 6 + browser-render engine).
- **Gate location:** `scripts/check-bundle-size.mjs`, runs in `pnpm verify`.
- **Headroom:** ~200 KB for incremental feature growth.

This gate ensures the development/demo surface does not regress. The published npm package itself has no bundle-size gate (you are responsible for tree-shaking in your build).

---

## Browser and Node.js compatibility

### Node.js versions

- **Minimum:** Node 22.11 (set in `package.json#engines`).
- **Tested:** Node 22, 24 (matrix in `.github/workflows/ci.yml`).
- **Module type:** ESM-first (`"type": "module"` in package.json), CJS shim provided.

If you require Node 20 or earlier, compatibility is not guaranteed. File an issue and we can assess backporting cost.

### Browser support

`pressedslip/browser` ships a resvg-wasm render path (Rust-compiled via wasm-pack). Browser compatibility mirrors wasm runtime support:

- **Modern evergreen browsers** (Chrome, Firefox, Safari, Edge): fully supported.
- **IE11, Edge <79:** not supported (no WebAssembly).
- **Safari <14.1:** wasm supported but font rendering limitations may apply (use local font fallbacks).

The browser entry uses dynamic imports for wasm; ensure your bundler supports ES2020+ syntax or transpile as needed.

### ESM / CommonJS

The package exports both formats:

```js
// ESM
import { render, createRegistry } from "pressedslip";

// CJS
const { render, createRegistry } = require("pressedslip");
```

TypeScript builds will auto-detect the correct shape (`.d.mts` for ESM, `.d.cts` for CJS).

---

## Performance

### Render throughput

Benchmarks against the reference marplanner use case (daily-print briefing):

- **Node.js render:** ~500 ms for a 6-block composition on M1 (deterministic across runs).
- **Browser render:** ~400 ms cold (wasm bootstrap) + ~50 ms subsequent renders (cached wasm instance).
- **Concurrency:** provider fetch is parallel; block render is sequential within a composition.

These are ballpark figures from internal validation runs. No formal perf suite exists yet; file an issue if your use case requires profiling.

### Determinism

**Important caveat:** PNG output is **not byte-identical** across operating systems, Node versions, or Bun versions. Font rasterizers (resvg + skia) produce platform-specific output. Do not use `toMatchSnapshot()` on raw PNG buffers. Use structural assertion helpers from `pressedslip/testing` instead (see [docs/guide/getting-started.md](./getting-started.md)).

---

## Observability hooks

### Logging and diagnostics

The package exports a `Logger` interface and `createConsoleLogger`. Pass a
compatible logger to `render()` when you want render-time warnings and errors
routed into your application's logging layer.

Provider diagnostics are carried on the `Composition` returned by `compose()`:
`providerOutcomes` records each provider's `ok` status, duration, cache hit
flag, and serialized error when applicable. Block-level failures are carried in
`Composition.failedBlocks` and `Rendering.failedBlocks`.

### Planned observability

- More granular render-pipeline stage durations (composition → SVG → raster → PNG).
- Structured error codes (network error, timeout, schema mismatch, etc.).

---

## Deferred production features

The package is actively developed. The following are deferred to later releases:

| Feature | Timeline |
|---|---|
| Automated release tooling (semantic-release) | v0.1.1 |
| Long-term support / LTS branches | post-v1.0.0 |
| CDN / hosted render service | not yet scoped |

If your organization requires these before adoption, reach out via a GitHub issue with your timeline.

---

## Decision checklist

Use this checklist to decide whether to evaluate further:

- [ ] MIT license is acceptable for your org.
- [ ] v0.x.y (pre-1.0, API may evolve in MINOR releases) fits your deploy timeline.
- [ ] Node 22+ and modern browsers are available in your environment.
- [ ] Thermal-printer output or printable-content rendering is your use case.
- [ ] You can accept platform-specific PNG output (not byte-deterministic) and test via structural assertions, not snapshots.

If all boxes checked, proceed to [Getting Started](./getting-started.md) for a 5-minute walkthrough.
