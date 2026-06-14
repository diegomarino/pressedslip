# ADR-0005: Node.js baseline — >=22.12

- **Status:** accepted (amended 2026-06-14: floor raised from 22.11 to 22.12)
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** dx, node-baseline

## Amendment — 2026-06-14

Original decision said `>=22.11` on the assumption that `require(esm)` was unflagged in 22.11. That was incorrect: `require(esm)` shipped behind `--experimental-require-module` in Node 22.x and only became enabled-by-default in **22.12.0** (2024-12-03). The 0.3.x CJS consumer regression that surfaced this (Fastify-on-Fly.io render call throwing `TypeError: (0, satori.default) is not a function`, then `ERR_REQUIRE_ESM` on 22.11 once the static-import interop fix landed) is documented in PR #7 / #8. Floor raised to **22.12** so a CJS `require("pressedslip")` resolves the transitive `satori` import without flags or workarounds.

## Context and problem statement

We need to declare a minimum Node.js version for the package. The choice affects which runtime APIs are available in `src/`, which consumers can use the package, and how the CI matrix is shaped.

## Decision drivers

- Current Active LTS version (broadest supported base)
- `require(esm)` support so CJS consumers can use the package
- Alignment with the reference project (marplanner runs Node 22)
- Unlock modern Node APIs (built-in WebSocket, stable `node:test`)

## Considered options

1. **Node 22.12** — current Active LTS; first version with unflagged `require(esm)`, stable WebSocket
2. **Node 20** — previous LTS, still in Maintenance; loses `require(esm)` entirely
3. **Node 24** — next LTS (active from Oct 2026); too new for most consumers today

## Decision outcome

**Chosen option: Node >=22.12** — Node 22 is the current Active LTS (until Oct 2026, then Maintenance until April 2027). The `require(esm)` capability became enabled by default in 22.12, which is what CJS consumers need to load this package's ESM-only transitive deps (notably `satori`) without `ERR_REQUIRE_ESM`. Marplanner (primary reference consumer) is already on Node 22. `.nvmrc` contains `22` so `nvm use` selects the latest installed 22.x. Bump policy to Node 24 deferred to sub-project 7.

### Positive consequences

- `require(esm)` lets CJS consumers use the package without workarounds
- Built-in WebSocket, stable `node:test`, best `--isolated-declarations` support
- Aligns with marplanner's existing environment

### Negative consequences / trade-offs

- Consumers on Node 20 (still in Maintenance until April 2026) are excluded
- Node 20 reached end-of-life April 2026, so this is a minor constraint

## Links

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
