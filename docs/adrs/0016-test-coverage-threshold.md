# ADR-0016: Test coverage threshold + provider

- **Status:** accepted
- **Date:** 2026-05-20
- **Deciders:** diego
- **Sub-project:** 1 (closure)
- **Tags:** testing, coverage, dx, enforcement

## Context and problem statement

Sub-project 0 deferred test coverage thresholds with the reason "defer until
there's code to cover". Sub-project 1 now ships 74 tests over ~18 source
files. Without a coverage gate, sub-projects 2–8 can add code without
proportional test coverage and the gap won't surface until far too late.

The decision must answer three sub-questions: what threshold, which Vitest
provider, and what to exclude from measurement.

## Decision drivers

- The gate must be enforceable in `pnpm verify` — local + CI, not opt-in.
- The threshold must be high enough to flag missing tests on critical paths but low enough to allow pragmatic exemptions (defensive branches, unreachable defaults).
- No external coverage service (Codecov, Coveralls) yet — sub-project 7 owns the publish workflow and will introduce CI.
- The provider choice affects both speed and branch-coverage precision.

## Considered options

1. **V8 provider, 85% lines / 75% branches** — native to Node, ~10–20% overhead, branch coverage adequate for the target.
2. **Istanbul provider, 90% lines / 85% branches** — more precise branch coverage, but 2–3× slower because of build-time instrumentation.
3. **No threshold, measure only** — `pnpm coverage` available but not gated.

## Decision outcome

**Chosen option: 1 (v8, 85/75)** — the V8 provider's overhead is invisible in practice and its branch precision is sufficient at the 75% target. Setting branches 10 points below lines acknowledges that V8 counts short-circuits and ternaries as branches in ways istanbul does not, so the lower target avoids false alarms without weakening real signal.

Option 3 is rejected for the same reason as ADR-0015: un-enforced policy becomes suggestion. Option 2 is rejected because the precision gain doesn't justify the speed cost for a project that will run coverage on every `verify`.

### Positive consequences

- Coverage is verified on every `pnpm verify` and on every pre-commit hook firing (indirectly, via `pnpm verify` running locally).
- Future sub-projects know exactly the bar they must meet.
- V8's speed makes coverage cheap enough to run in inner-dev loops if desired.

### Negative consequences / trade-offs

- Some defensive branches (e.g., `if (gray !== undefined && gray <= threshold)` where the undefined case is unreachable given upstream guarantees) may need either targeted tests or `/* c8 ignore next */` comments. The spec mandates writing tests, not lowering thresholds.
- No per-file thresholds — a new file with low coverage drags the global down but doesn't fail until the global drops below 85%.

## Pros and cons of the options

### Option 1 — V8, 85/75

- ✅ Fast (~10–20% overhead)
- ✅ Native — no instrumentation step
- ✅ Adequate branch precision at the chosen target
- ❌ Branch counts can include unreachable defensive code

### Option 2 — Istanbul, 90/85

- ✅ More precise branch coverage
- ❌ 2–3× slower
- ❌ Higher target risks routine flakes on defensive code

### Option 3 — No threshold

- ✅ Zero friction
- ❌ Fails the enforceability requirement

## Exclusions

The coverage configuration excludes:

- `src/types.ts` — type-only, no runtime code.
- `src/index.ts` — pure re-exports, no logic.
- `scripts/**` — build tooling, not part of the shipped package.
- `tests/**`, `dist/**`, `node_modules/**` — Vitest defaults.

## Links

- Related: ADR-0008 (quality-bar-never-rules — no silent failures)
- Related: ADR-0007 (test-runner-vitest)

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
