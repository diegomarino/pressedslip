# ADR index

These ADRs are the project's internal design history. They reference internal development-phase vocabulary — "Sub-project: N", "spN" tags, and "marplanner", the private reference consumer the library was extracted from. They are kept verbatim as historical record and are not normative user documentation; user-facing guidance lives in `docs/guide/`.

---

| ADR | Title | Status | Decision summary |
|---|---|---|---|
| [0001](0001-build-tool-tsdown.md) | Build tool — tsdown | accepted | Use tsdown (Rolldown-based tsup successor) as the build tool. |
| [0002](0002-package-manager-pnpm.md) | Package manager — pnpm 10.x | accepted | Use pnpm for strict node_modules layout and `workspace:*` dist consumption. |
| [0003](0003-linter-formatter-biome-alone.md) | Linter + formatter — Biome 2.x alone | accepted | Use Biome 2.x as the sole linter and formatter; no ESLint or Prettier. |
| [0004](0004-git-hooks-husky-alone.md) | Git hooks — Husky 9.x alone (no lint-staged) | accepted | Use Husky alone; Biome's `--staged` mode replaces lint-staged. |
| [0005](0005-node-baseline-22.md) | Node.js baseline — >=22.11 | accepted | Target Node >=22.11 (Active LTS) for native ESM `require()` support. |
| [0006](0006-repo-topology-workspace-at-root.md) | Repository topology — pnpm workspace, publishable package at root | accepted | Place the publishable package at the workspace root so dist is always exercised. |
| [0007](0007-test-runner-vitest.md) | Test runner — Vitest 4.1.x | accepted | Use Vitest 4.x for native TypeScript/ESM support and Jest-compatible API. |
| [0008](0008-quality-bar-never-rules.md) | Quality bar — five rules we never relax | accepted | Enforce five hard lint rules (no `any`, no silent failures, etc.) at `error` level. |
| [0010](0010-naming-conventions.md) | Naming conventions — noun-only root types, verb functions | accepted | Root data type is `Composition`; all public types are nouns, all verbs are functions. |
| [0011](0011-public-api-shape.md) | Public API shape — root-only entry, 25 named exports | accepted | All exports come from the package root; subpath exports deferred to later sub-projects. |
| [0012](0012-visual-shape-block-taxonomy.md) | Block taxonomy — visual shapes, not content sources | accepted | Ship generic visual-shape blocks only; consumers define content-source blocks via `defineBlock`. |
| [0013](0013-widthspec-and-paper.md) | WidthSpec discriminated union and PAPER presets | accepted | Accept `{ mm, dpi? }` or `{ px }` width; `PAPER` presets are informational hardware annotations. |
| [0014](0014-error-handling-and-no-silent-failures.md) | Error handling and no-silent-failures invariant | accepted | `failedBlocks` is always populated; error modes control side effects only, never suppress records. |
| [0015](0015-jsdoc-enforcement-via-custom-script.md) | JSDoc enforcement via custom script | accepted | Enforce `@fileoverview` + JSDoc coverage via a custom script instead of an ESLint plugin. |
| [0016](0016-test-coverage-threshold.md) | Test coverage threshold + provider | accepted | Use V8 provider with 85% lines / 75% branches thresholds; scripts and types excluded. |
| [0017](0017-font-loader-fetch-only.md) | Font loader is fetch-only | accepted | `loadFontFromUrl` uses global `fetch` only; no `fs` reads, making it browser-safe. |
| [0018](0018-browser-render-resvg-wasm.md) | `/browser` render via `@resvg/resvg-wasm` + byte-identical determinism gate | accepted | `/browser` render is backed by `@resvg/resvg-wasm` with a byte-identical parity gate vs Node. |
| [0019](0019-browser-barrel-full-re-export.md) | `/browser` barrel — full re-export of registry + blocks + providers | accepted | `/browser` re-exports the complete public surface so tree-shaking handles elimination. |
| [0020](0020-shell-theme-adoption.md) | Shell theme adoption (BlockShell + ShellTop) | accepted | `BlockShell` and `ShellTop` adopt marplanner's shell visuals as the canonical chrome style. |
| [0021](0021-theme-primitive.md) | Theme primitive (public API) | accepted | Ship a public `defineTheme` API controlling shell chrome + font roles; block internals stay theme-unaware. |
| [0022](0022-blockdefinition-hints.md) | `BlockDefinition.hints` + `composeJsoncWithHints` | accepted | Add optional `hints` field to block definitions and a synchronous JSONC emitter that inlines them as comments. |
| [0024](0024-marplanner-byo-bytes-pattern.md) | Marplanner adopts the "bring your own bytes" PreparedTheme pattern | accepted | Marplanner ships its theme as a package that builds a `PreparedTheme` from embedded font bytes. |
| [0025](0025-theme-text-role-vocabulary.md) | Theme text-role vocabulary (`textStyles` slots + cascade) | accepted | Define six canonical `textStyles` slots plus an `extras` escape hatch for block typography. |
| [0026](0026-textstyle-mapping-multi-field-structured-blocks.md) | TextStyle mapping for multi-field structured blocks | accepted | Prefer canonical slots; use `extras.<key>` only when no canonical slot has a semantic fit. |
| [0027](0027-block-variants-vs-theme-tokens.md) | Block variants vs theme tokens — decision rule | accepted | New schema → new block definition; atomic visual variation within same schema → theme token. |
| [0028](0028-textstyles-builtin-migration.md) | Built-in block TextStyles migration | accepted | Migrate all 6 built-in blocks to read `ctx.theme.textStyles`; block intent spreads after slot style. |

---

> **Template:** [ADR-0000](0000-adr-template.md) — copy this file to start a new ADR.
