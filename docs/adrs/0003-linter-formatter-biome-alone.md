# ADR-0003: Linter + formatter — Biome 2.x alone

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** dx, linter, formatter

## Context and problem statement

We need linting and formatting for a TypeScript library. The toolchain should be fast, unified (one config), and support staged-file filtering natively for the pre-commit hook.

## Decision drivers

- Single config file, single CI command
- Staged-file filtering without lint-staged
- Speed (CI and local pre-commit)
- Coverage of the five quality rules that must never be relaxed

## Considered options

1. **Biome 2.x alone** — unified linter+formatter, native `--staged` mode
2. **ESLint + Prettier + lint-staged** — industry default, rich plugin ecosystem
3. **ESLint + Biome formatter** — hybrid approach

## Decision outcome

**Chosen option: Biome 2.x alone** — one config file (`biome.json`), one CI command, Biome's built-in `--staged` mode replaces lint-staged entirely (~30 fewer transitive packages). 25× faster than ESLint+Prettier. Biome 2.x covers ~80% of common ESLint rules; the gap is framework-specific plugins we don't need. Reversible: `npx @biomejs/biome migrate eslint --write` exists if a future plugin need emerges.

**Rule name deviations from spec at scaffold time:**

- `noConsoleLog` does not exist in Biome 2.4; replaced with `noConsole` with `options.allow: ["warn", "error"]`
- `noCognitiveComplexity` does not exist in Biome 2.4; omitted (no equivalent available)

### Positive consequences

- One tool, one config, one install
- Native `--staged` eliminates lint-staged dependency
- 25× faster than ESLint+Prettier in CI and pre-commit

### Negative consequences / trade-offs

- ~20% of ESLint rules not covered (framework plugins, custom rules)
- Biome rule taxonomy differs from ESLint; migration requires learning new rule paths

## Links

- [Biome 2.x docs](https://biomejs.dev)
