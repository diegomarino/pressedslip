# Contributing to pressedslip

Welcome. This is a one-person OSS project that genuinely wants outside help,
but hasn't grown a steering committee yet. Pre-v1.0 means the API is still
in motion, so contributions should be small and iterative — no sweeping
redesigns, no RFC process. A focused bug fix, a missing test, a clearer error
message, or a new builtin block are the kinds of changes that land quickly.

---

## Dev environment setup

**Prerequisites:** Node 22.11 or later (see `.nvmrc`; the rationale is in
[`docs/adrs/0005-node-baseline-22.md`](./docs/adrs/0005-node-baseline-22.md)).
pnpm is the package manager
([`docs/adrs/0002-package-manager-pnpm.md`](./docs/adrs/0002-package-manager-pnpm.md)).

```bash
# fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/pressedslip.git
cd pressedslip
pnpm install          # also wires husky pre-commit / pre-push hooks
```

Create a branch for your change:

```bash
git checkout -b my-fix
```

Run the full verify gate before pushing:

```bash
pnpm verify           # lint + build + typecheck + test + doc-check + coverage
```

If this passes locally, CI will pass. Then push to your fork and open a PR
against `main` on the upstream repo.

---

## Architecture diagrams

Architecture diagrams are inline Mermaid code blocks inside
`docs/architecture/*.md`. Edit the Mermaid source in the page that owns the
concept; there is no generated SVG artifact to refresh.

Keep diagrams small enough to read in GitHub's Markdown renderer. When a guide
needs a diagram, link to the relevant architecture page instead of duplicating
the diagram.

---

## Running tests, build, and the playground

```bash
pnpm test             # vitest, single run
pnpm test:watch       # vitest watch mode (useful during active development)
pnpm coverage         # vitest with coverage; HTML report at coverage/index.html
pnpm build            # tsdown — outputs to dist/
pnpm verify           # everything, end-to-end
```

The playground smoke test uses Playwright. On a clean machine, install Chromium
once before running the full verify gate:

```bash
pnpm --filter pressedslip-playground exec playwright install --with-deps chromium
```

**Playground** (browser-based interactive renderer):

```bash
pnpm --filter pressedslip-playground dev     # Vite dev server with HMR, port 4173
pnpm --filter pressedslip-playground serve   # production build + preview
```

Open `http://localhost:4173/pressedslip/` once the server is running.
Both commands bind `--strictPort` so a port conflict fails loudly.

**CLI block renderer** (per-block PNG snapshots, useful during block development):

```bash
pnpm dev:render <block> <fixture>   # e.g. pnpm dev:render textCell basic
pnpm dev:render:all                 # render every block x fixture pair
pnpm dev:render:watch               # render:all + re-render on src/ change
```

Output PNGs go to `out/` (git-ignored). The result is byte-identical to what
the library would print on a thermal printer — same pipeline: Satori to resvg
to 1-bit threshold to PNG.

### Where to put a new test

The project uses **two test locations on purpose** — pick by the test's intent,
not by what feels nearby:

- **`src/**/__tests__/`** — *whitebox* tests that reach into module internals
  (not-exported helpers, invariants enforced by file-private code). Colocate
  with the module under test so the relative import is short and the test
  travels with the code if the module moves.
- **`tests/`** — *blackbox* tests of the public surface, integration tests
  that cross module boundaries, fixture-driven regression suites, and anything
  consumer-shaped (importing from `"pressedslip"` or a subpath). Mirror the
  `src/` layout under `tests/unit/` when the test is unit-scoped but only
  touches public API.

If a test could live in either place, prefer `tests/` — it's the boundary
that consumers see, and tests living there can't accidentally couple to
internals you'd want to refactor.

---

## Adding a builtin block (internal path)

This section is for contributing a new block to the `pressedslip` package
itself. If you want to build a custom block as a *consumer* of the package,
see [`docs/guide/custom-block-walkthrough.md`](./docs/guide/custom-block-walkthrough.md)
instead — that flow uses the public `defineBlock()` API and is a different concern.

### File layout

Each block lives in `src/blocks/` and follows this structure:

```
src/blocks/
  my-block.tsx          # JSX renderer (Satori-compatible React)
  my-block.fixtures.ts  # test fixtures exported by name
```

### Schema + generator + renderer contract

A block definition has three parts:

1. **Schema** — a `z.object(...)` (Zod) that validates the data payload.
   Define it in the block file and use it as the input type.
2. **Generator** — a function `(data: MyBlockData, context: RenderContext) => MyBlockData`
   that pre-processes or defaults the incoming data. Can be identity for simple blocks.
3. **Renderer** — a JSX function `(props: MyBlockData) => JSX.Element` that
   Satori will turn into SVG. Keep it stateless and pure; Satori does not
   support all CSS properties — check its documentation before using flex layout tricks.

### Registering in `builtinBlocks`

`src/index.ts` exports the `builtinBlocks` array. Import your block definition
and append it:

```ts
export const builtinBlocks: readonly AnyBlockDefinition[] = Object.freeze([
  textCellBlock,
  keyValueBlock,
  // ... add yours here
  myBlock,
]);
```

### Adding test fixtures

In `my-block.fixtures.ts`, export one or more named fixture objects matching
your block's schema. The dev-render CLI and the test suite both discover
fixtures via `"pressedslip/testing"` — any named export there becomes a
renderable and testable case automatically.

---

## Code style

Formatting and linting are handled by Biome — no manual style decisions needed.

The rules that are **never relaxed** are documented in
[`docs/adrs/0008-quality-bar-never-rules.md`](./docs/adrs/0008-quality-bar-never-rules.md).
Short version:

1. No `any` — use `unknown` + narrowing, or bounded generics.
2. No silent failures — every promise is awaited or `void`-ed; every `switch`
   over a union is exhaustive; every `catch` does something.
3. No `console.log` / `console.debug` in `src/` — `console.warn` and
   `console.error` are fine for actionable misconfiguration messages.
4. No default exports from `src/` — named exports only.
5. No `// @ts-ignore` — use `// @ts-expect-error -- <reason>` instead.

CI blocks any PR that violates these. If you believe a rule is wrong for your
case, open an issue rather than working around it.

### JSDoc policy

Every file under `src/` must start with a `/** @fileoverview ... */` block.
Every directly-exported declaration must be preceded by a JSDoc block with at
least 20 non-whitespace characters of prose. `pnpm check-docs` (part of
`pnpm verify`) enforces this and will block locally via the pre-commit hook.
See [`docs/adrs/0015-jsdoc-enforcement-via-custom-script.md`](./docs/adrs/0015-jsdoc-enforcement-via-custom-script.md) for the rationale.

### Test coverage

`pnpm verify` enforces minimum coverage thresholds (lines/functions/statements
85%, branches 75%). If your change drops coverage below these thresholds, add
tests — thresholds are not lowered to make a commit land.
See [`docs/adrs/0016-test-coverage-threshold.md`](./docs/adrs/0016-test-coverage-threshold.md) for the exclusion details.

---

## Git tag convention

Tags like `sp2-closed`, `sp3-closed`, `sp4-closed`, `sp5-closed`, and
`sp6.5-closed` are historical development-phase markers from the initial
extraction work. They are kept for traceability and referenced by the
changelog strategy — do not delete them. Once the project reaches v1.0,
feature releases follow `vMAJOR.MINOR.PATCH`.

---

## PRs and issues

There are no formal PR templates in `.github/` yet. When you open a PR:

- Describe *what* changed and *why* in the PR body.
- Link the relevant ADR or spec if the change touches a design decision.
- Make sure `pnpm verify` passes locally — CI runs the same gate on Ubuntu +
  macOS, Node 22 + 24, and a failing CI is a blocker.

For bug reports or feature requests, open a GitHub issue with enough context
to reproduce or understand the request. No triage SLA — this is a one-person
project — but well-scoped issues get attention.

---

## No RFC process

Pre-v1.0, big design discussions happen in issues and ADRs, not in a formal
RFC pipeline. Propose → discuss → small PR. If something is genuinely complex,
suggest a spike or a draft ADR in `docs/adrs/` (copy `0000-adr-template.md`)
and iterate from there.
