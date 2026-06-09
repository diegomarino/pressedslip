# ADR-0022 — BlockDefinition.hints + composeJsoncWithHints

**Date:** 2026-05-24
**Status:** Accepted
**Supersedes:** none
**Superseded by:** none

## Context

The playground's JSONC pane (sp6.5) ships with a hand-written seed string that includes narrative `//` comments explaining each block type. Those comments are static: they live in `apps/playground/src/initial-composition.ts` and only display on initial load. Any builder mutation (insert/delete/reorder) regenerates the JSONC text via `JSON.stringify(editor.draft, null, 2)` and wipes ALL comments — handwritten preamble AND per-slot narration.

Two observations drove the design:

1. **Hints should be a property of the block, not the playground.** A developer integrating pressedslip server-side and generating a Composition programmatically benefits from the same hints. If `BlockDefinition` declares what `data` the block accepts (via the Zod schema), why not also declare brief inline guidance?
2. **Comment preservation across builder mutations** is a separate problem (a CodeMirror+jsonc-parser surgery challenge). What IS in scope here: any time the canonical-fallback path regenerates JSONC text, inject block hints so the output remains self-documenting.

## Decision

Three pieces ship together:

1. **`BlockDefinition.hints?: readonly string[]`** — additive optional field on `BlockDefinitionSpec<TData>`. Renderer-agnostic textual hints. Each entry MUST be a single line (no `\n` / `\r`). The helper normalizes newlines to spaces as defense-in-depth, but block authors should keep entries single-line.

2. **`composeJsoncWithHints(composition, registry): string`** — new public helper at `src/compose-jsonc.ts`. Hand-rolls ~55 LOC of JSONC emission (vs depending on a comment-preserving writer). Each slot is preceded by `// <hint>` lines pulled from the registered block's `hints` array. Custom blocks without hints emit no comments — safe degradation.

3. **Format convention (4 visually-parseable prefixes)** — `Required:`, `Values of`, `Tip:`, `Docs:`. The `Docs:` line always last, repo-local path. Convention documented but NOT enforced at type level: bad hints are docs bugs, not runtime bugs.

### `Docs:` repo-local-path policy

Builtin blocks' `Docs:` entries point to `docs/blocks/<name>.md` — paths valid for repo contributors reading the playground/seed. The `docs/blocks/` directory does NOT ship in the npm tarball. Consumers writing custom blocks for npm publication SHOULD omit the `Docs:` line or substitute an absolute URL. A configurable `docsUrlBase` is deferred to a future v2.

## Consequences

- **Positive:** Any time the playground regenerates JSONC text (every builder mutation), block hints reappear automatically — the JSON pane is always self-documenting for the block contracts. Custom-block authors gain the same surface for free by populating `hints`. Server-side debuggers using `composeJsoncWithHints` get readable diffs in stored briefings.

- **Negative:** Preamble narrative + per-slot handwritten comments in the seed still get wiped on first builder mutation. Spec §2 acknowledges this is out of scope; ADR is honest about the limitation.

- **Type-level guarantees not provided:** `string[]` does NOT enforce single-line entries. The helper's `normalizeHintLine()` is runtime defense-in-depth (test #8 asserts the behavior). A stricter typed approach (e.g., a branded `SingleLineHint` type) was rejected as overhead disproportionate to benefit.

## Alternatives considered

1. **Per-field inline hints (Level 2)** — emit `// comment` after each field name inside the slot. Rejected for v1: more complex emit logic, requires Zod-schema introspection to anchor hints to fields, deferred to v2 if demand emerges.

2. **Zod-derived hints (Level 3)** — auto-derive hints from the Zod schema (which fields are required, which have enum values). Rejected: Zod schema introspection at runtime is fragile across Zod versions; static `hints?: readonly string[]` is portable and matches the existing project pattern of hand-curated docstrings.

3. **`jsonc-parser.modify()` for emit** — use Microsoft's `jsonc-parser` to build the JSONC string. Rejected: `jsonc-parser.modify` is designed for surgical edits to existing JSONC documents, not for emit-from-scratch with comment injection. Hand-rolled emission is ~55 LOC and avoids the dependency for build output (jsonc-parser stays as a runtime dep of the playground only).

4. **Embedding hints into the Composition itself** (e.g., `__hints__` property) — rejected: violates the "composition is data" principle; mixes rendering metadata with author content; would require schema changes.

5. **Strict single-line enforcement at `defineBlock` time** — throw if a hint contains `\n`. Rejected as too aggressive for v1; runtime normalization is forgiving and tests verify the contract.

## References

- Predecessor ADR-0021 (theme primitive) — same "additive optional public field" pattern.
- Predecessor ADR-0020 (shell theme adoption) — establishes the `BlockShellOptions` precedent for per-block configuration knobs.
