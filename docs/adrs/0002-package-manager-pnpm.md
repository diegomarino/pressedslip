# ADR-0002: Package manager — pnpm 10.x

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** dx, package-manager

## Context and problem statement

A monorepo workspace with a publishable root package and private playground/examples siblings needs a package manager that enforces dependency isolation, supports workspace protocols, and generates reproducible lockfiles.

## Decision drivers

- Phantom-dependency prevention (strict node_modules isolation)
- Workspace protocol (`workspace:*`) for siblings to consume the root package
- Corepack version pinning via `packageManager` field
- Wide adoption in OSS monorepos

## Considered options

1. **pnpm 10.x** — strict isolation, fast installs, workspace protocol
2. **npm workspaces** — built-in but no phantom-dep prevention
3. **yarn berry** — strict mode available but more complex setup

## Decision outcome

**Chosen option: pnpm 10.x** — pnpm's strict node_modules layout prevents phantom dependencies, which is the root cause of the family of packaging bugs in the reference project (audit B7). The `workspace:*` protocol ensures playground/examples consume the built dist via `package.json#exports`, not raw source. The `packageManager` field in `package.json` pins the exact version via Corepack, preventing lockfile incompatibilities across contributors.

### Positive consequences

- Phantom-dependency bugs caught at install time
- Workspace siblings exercise the real published shape (exports map, dual ESM/CJS)
- Corepack enforces consistent pnpm version across all contributors

### Negative consequences / trade-offs

- Contributors need Corepack enabled (or pnpm installed separately)
- pnpm 10.x minor versions may have behavioral changes; pinning to exact version adds maintenance overhead

## Links

- [pnpm workspaces docs](https://pnpm.io/workspaces)
