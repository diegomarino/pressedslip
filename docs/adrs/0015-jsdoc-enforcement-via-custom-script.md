# ADR-0015: JSDoc enforcement via custom script

- **Status:** accepted
- **Date:** 2026-05-20
- **Deciders:** diego
- **Sub-project:** 1 (closure)
- **Tags:** dx, documentation, enforcement, no-eslint

## Context and problem statement

The project ships a public API (sub-project 1 wired 25 exports). Documentation
on those exports is currently uneven: `src/types.ts` has rich JSDoc on every
type, but several pipeline functions and the shell components have either
sparse comments or none. As the project grows through sub-projects 2–8, more
exports land. Without enforcement, doc gaps drift in silently — especially
when AI coding agents work on the codebase and treat un-enforced policy as
a suggestion.

ADR-0003 chose Biome alone for lint+format. Biome does not provide a rule
to require JSDoc presence on exported declarations (verified 2026-05-20 via
Biome 2.x docs and web search). The industry-standard tool is
`eslint-plugin-jsdoc` with `jsdoc/require-jsdoc` + `publicOnly: true`.

## Decision drivers

- The policy must be enforceable in `pnpm verify` AND in `.husky/pre-commit` — silent drift is the failure mode being prevented.
- The project has no consumers yet; the cost of revisiting tooling later is near-zero.
- ADR-0003 expressed a preference for one tool per category.
- The sub-project 1 export surface is small and homogeneous (no overloads, no namespace exports, no decorators) — the edge-case surface a JSDoc enforcer must handle is currently tiny.

## Considered options

1. **Adopt `eslint-plugin-jsdoc`** — install ESLint + plugin + flat config; run only the JSDoc rules.
2. **Write a custom Node script using the TypeScript Compiler API** — ~100 LOC, no new dependencies (TypeScript is already a devDep).
3. **Keep enforcement social** — document in CONTRIBUTING.md, no machine check.

## Decision outcome

**Chosen option: 2 (custom script)** — for a 25-export library with no overloads or other complex syntactic surface, the script's edge-case area is genuinely small. ADR-0003's "Biome alone for lint+format" stands because the custom script is not a general linter — it is a single-purpose checker. Adopting ESLint as a single-purpose tool would import 80+ transitive dependencies to validate the presence of a comment, which is the wrong ratio of weight to value.

Option 3 is rejected because the driving concern is AI agents drifting from un-enforced policy.

### Positive consequences

- Zero new dependencies. The script reuses `typescript@^6` which is already installed.
- No ESLint config to maintain alongside Biome's.
- ADR-0003's "one tool per category" promise survives intact.
- Error messages are tuned to the project's vocabulary (e.g., "Exported function `X` missing JSDoc block").

### Negative consequences / trade-offs

- Maintenance burden lives in this repo: the script is ours to debug.
- Edge-cases not currently exercised (overloads, ambient declarations, namespace exports, decorators) will need to be added to the script when they emerge.
- Reviewers unfamiliar with the script must read it to understand what it enforces — `eslint-plugin-jsdoc` would have come with a documented rule set.

## Pros and cons of the options

### Option 1 — eslint-plugin-jsdoc

- ✅ Industry-standard, 7+ years of edge-case coverage
- ✅ Configurable via flat config; well-documented
- ❌ 80+ transitive dependencies for one rule's worth of behavior
- ❌ Introduces ESLint alongside Biome, contradicting ADR-0003's spirit
- ❌ Requires either a parallel "ESLint for X, Biome for Y" config story OR migrating broader lint into ESLint

### Option 2 — custom script

- ✅ Zero new dependencies
- ✅ Error messages, fixture tests, and rules all match this codebase
- ✅ ADR-0003 unaffected
- ❌ ~100 LOC of TypeScript Compiler API code that we maintain
- ❌ Edge-cases (overloads, etc.) must be added by us as they surface

### Option 3 — social policy only

- ✅ Zero implementation cost
- ❌ Fails the core requirement: machine-enforceable
- ❌ AI agents treat soft policy as suggestion; drift becomes inevitable

## Exit hatch

If more than three distinct edge-cases requiring script changes emerge between sub-projects 2 and 7, open a successor ADR to migrate to `eslint-plugin-jsdoc`. Tracking: count occurrences in the project's commit history matching `fix(check-docs):` or `feat(check-docs):` that add support for a new declaration shape.

## Links

- Related: ADR-0003 (linter-formatter-biome-alone)
- Related: ADR-0008 (quality-bar-never-rules — no silent failures)

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
