# ADR-0001: Build tool — tsdown

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** build-tool, dx

## Context and problem statement

We need a build tool that compiles TypeScript to dual ESM+CJS, emits `.d.ts` files, and supports `isolatedDeclarations` for parallelizable type-declaration generation. The tool must be actively maintained given this is a new project targeting 2026+.

## Decision drivers

- Active maintenance (no deprecated tools)
- Dual ESM+CJS output with a single config
- `isolatedDeclarations` support for fast `.d.ts` emission via Oxc
- Drop-in compatibility with existing tsup configs (for reference projects like marplanner)

## Considered options

1. **tsdown** — Rolldown-based official tsup successor
2. **tsup** — previous standard, now officially deprecated by its author
3. **tshy/zshy** — pure-tsc approach, no bundler
4. **Plain tsc ESM-only** — simplest but no CJS output

## Decision outcome

**Chosen option: tsdown** — tsdown is the Rolldown-based official successor to tsup; tsup's README points users to tsdown as of 2026. Configs are drop-in compatible. Starting a fresh project on a deprecated tool would be poor signaling. tsdown's Oxc backend also provides the best support for `isolatedDeclarations`.

**Version pinning:** exact patch version (e.g. `0.22.0`), not caret, because tsdown is pre-1.0 and minor bumps may include breaking changes. Bumping requires a deliberate PR.

### Known restrictions

`isolatedDeclarations: true` (in `tsconfig.build.json` only) restricts: computed property keys (`[Symbol.iterator]`), certain class-expression forms. These require explicit type annotations. Acceptable trade-off for parallelizable `.d.ts` emission.

### Positive consequences

- Active tool, not deprecated
- Fast dual-format builds via Rolldown
- `isolatedDeclarations` forces explicit public-API return types (no accidental `any` leakage)

### Negative consequences / trade-offs

- Pre-1.0: minor bumps may be breaking; exact-pin policy adds maintenance overhead
- `isolatedDeclarations` restrictions require extra annotations on complex exports

## Links

- [tsdown GitHub](https://github.com/sxzz/tsdown)
