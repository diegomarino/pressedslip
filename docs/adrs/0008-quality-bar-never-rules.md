# ADR-0008: Quality bar — five rules we never relax

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** quality, dx, api-surface

## Context and problem statement

OSS libraries accumulate technical debt through individually-reasonable exceptions to type safety and code clarity rules. We need a small set of non-negotiable rules that are enforced by tooling (not just convention) across all sub-projects, with explicit rationale for why each one can never be relaxed.

## Decision drivers

- Consumer type inference must be trustworthy (library DX)
- Silent failures destroy consumer trust in async libraries
- Clean production logs (no debug noise shipped to consumers)
- Tree-shaking guarantees for named exports
- Self-cleaning suppression comments (no permanent silencing of type errors)

## Considered options

1. **Five hard rules enforced at `error` level in Biome** — non-negotiable across all sub-projects
2. **Soft conventions in CONTRIBUTING.md only** — relies on code review, not tooling
3. **Larger set of strict rules** — more coverage but higher contributor friction

## Decision outcome

**Chosen option: five hard rules at `error` level** — enforced by `biome.json`, checked in `pre-commit` and CI. These five are the minimum necessary to prevent the most common class of library quality failures:

### The five rules

1. **No `any`** (`noExplicitAny: error`) — `any` poisons consumer type inference. An `any` in a library's public API silently turns off type checking for every consumer that touches the affected value. Universal OSS DX rule.

2. **No silent failures** — `noFloatingPromises: error`, `noEmptyBlockStatements: error`, `useExhaustiveSwitchCases: error`. Async libraries with unhandled promise rejections or silently-swallowed errors destroy consumer trust and produce impossible-to-debug production failures.

3. **No `console.log`/`console.debug` in `src/`** — chatty dev logs shipped in a library pollute every consumer's output. `console.warn` and `console.error` ARE allowed for actionable misconfiguration warnings (matches React, Vite, Zod). Enforced via `noConsole` with `allow: ["warn", "error"]`.

4. **No default exports from `src/`** (`noDefaultExport: error`) — named exports only. Guarantees consistent import names across consumer codebases, enables reliable tree-shaking, and avoids the `import Foo` vs `import { Foo }` ambiguity. Standard in zod, react, satori.

5. **No `// @ts-ignore`** — only `// @ts-expect-error -- <reason>` is allowed. `@ts-expect-error` self-cleans when the underlying issue is fixed (tsc errors if the suppression is no longer needed). `@ts-ignore` outlives the bug it hid indefinitely.

### Test-file relaxation

`noExplicitAny` and `noNonNullAssertion` are downgraded to `warn` inside `tests/**` and `**/*.test.ts`. Real-world test fixtures occasionally need narrow `as any` casts for mock shapes; gating that on lint produces creative workarounds worse than the cast.

### Positive consequences

- Type safety violations caught at commit time, not in consumer bug reports
- No production console noise shipped to consumers
- Self-cleaning `@ts-expect-error` suppression comments

### Negative consequences / trade-offs

- Higher initial friction for contributors unfamiliar with strict Biome rules
- `noFloatingPromises` requires explicit `.catch()` or `void` prefix on every floating promise (acceptable verbosity for an async library)

## Links

- [Biome linter rules](https://biomejs.dev/linter/rules/)
