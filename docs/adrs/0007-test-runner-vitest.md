# ADR-0007: Test runner — Vitest 4.1.x

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** dx, test-runner

## Context and problem statement

We need a test runner for a TypeScript ESM library. The runner must support native TypeScript without a separate compilation step, and ideally support browser-mode testing for future sub-projects (sub-project 6 adds a playground with UI integration tests).

## Decision drivers

- Native TypeScript + ESM support (no separate tsc or babel step)
- Jest-compatible API (familiar to most contributors)
- Browser Mode for future playground integration tests (sub-project 6)
- Active maintenance and ecosystem momentum in 2026

## Considered options

1. **Vitest 4.x** — native TS+ESM, Jest-compatible, Browser Mode stable in v4
2. **Jest** — industry default; requires `ts-jest` or `babel-jest` for TypeScript
3. **Node built-in `node:test`** — zero-dependency, but no watch mode, no coverage UI, no browser mode

## Decision outcome

**Chosen option: Vitest 4.x** — native TypeScript and ESM support means no transpilation step for tests. Jest-compatible API means near-zero learning curve. Browser Mode became stable in Vitest v4, which matters for sub-project 6's playground integration tests. No real alternative for TS libraries in 2026.

### Positive consequences

- Zero config for TypeScript: Vitest reads `tsconfig.json` natively
- HMR-powered watch mode for fast TDD cycles
- Browser Mode ready for sub-project 6 without switching runners
- Jest-compatible API: `describe`, `it`, `expect` — familiar to all contributors

### Negative consequences / trade-offs

- Adds a dev dependency (vs zero-dep `node:test`)
- Vitest's browser mode requires Playwright or WebdriverIO — additional setup for sub-project 6

## Links

- [Vitest docs](https://vitest.dev)
