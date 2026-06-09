# ADR-0005: Node.js baseline — >=22.11

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** dx, node-baseline

## Context and problem statement

We need to declare a minimum Node.js version for the package. The choice affects which runtime APIs are available in `src/`, which consumers can use the package, and how the CI matrix is shaped.

## Decision drivers

- Current Active LTS version (broadest supported base)
- `require(esm)` support so CJS consumers can use the package
- Alignment with the reference project (marplanner runs Node 22)
- Unlock modern Node APIs (built-in WebSocket, stable `node:test`)

## Considered options

1. **Node 22.11** — current Active LTS; unlocks `require(esm)`, stable WebSocket
2. **Node 20** — previous LTS, still in Maintenance; loses `require(esm)`
3. **Node 24** — next LTS (active from Oct 2026); too new for most consumers today

## Decision outcome

**Chosen option: Node >=22.11** — Node 22 is the current Active LTS (until Oct 2026, then Maintenance until April 2027). The `require(esm)` capability means CJS consumers don't need dynamic `import()` workarounds. Marplanner (primary reference consumer) is already on Node 22. `.nvmrc` contains `22` so `nvm use` works seamlessly. Bump policy to Node 24 deferred to sub-project 7.

### Positive consequences

- `require(esm)` lets CJS consumers use the package without workarounds
- Built-in WebSocket, stable `node:test`, best `--isolated-declarations` support
- Aligns with marplanner's existing environment

### Negative consequences / trade-offs

- Consumers on Node 20 (still in Maintenance until April 2026) are excluded
- Node 20 reached end-of-life April 2026, so this is a minor constraint

## Links

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
