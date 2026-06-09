# ADR-0006: Repository topology — pnpm workspace, publishable package at root

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** dx, repo-topology

## Context and problem statement

We need a monorepo layout that keeps the publishable package's `package.json` as the workspace root, while hosting private playground and examples siblings that consume the built package — not the raw source.

## Decision drivers

- Playground/examples must exercise the real published shape (exports map, dual ESM/CJS, peerDeps)
- Only one package will ever be published (master-plan decision #1)
- Siblings should import from `"pressedslip"` not `"../src"` to catch packaging bugs early

## Considered options

1. **Publishable package at root** — `./package.json` is the one that gets `npm publish`ed
2. **`packages/pressedslip/` (classic monorepo)** — adds nesting without benefit
3. **Flat single-package + subdirectories** — playground imports from `../src/index.ts` directly

## Decision outcome

**Chosen option: publishable package at root** — the playground and examples consume the *built dist* via `workspace:*` and `package.json#exports`. Every build run exercises the real published shape. This is the strongest possible day-1 catch for the family of packaging bugs (audit B7, L13) that the reference project accumulated because nothing exercised the published shape during development.

The reference project shipped CJS pointing at raw `src/*.ts` for years precisely because its internal consumers imported from source, not from the dist. This topology makes that class of bug structurally impossible.

### Positive consequences

- Packaging bugs (wrong exports map, missing CJS, wrong types path) caught on every `pnpm build`
- No nesting: `./package.json` is exactly what gets published — no extra path transformations
- Workspace siblings import `"pressedslip"` — same as end consumers

### Negative consequences / trade-offs

- Unusual topology: contributors may expect `packages/` subdirectory
- `playground` and `examples` must have `package.json` added before they can be workspace members (`.gitkeep` only in sub-project 0)

## Links

- [pnpm workspace docs](https://pnpm.io/workspaces)
