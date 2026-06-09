# ADR-0004: Git hooks — Husky 9.x alone (no lint-staged)

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 0
- **Tags:** dx, git-hooks

## Context and problem statement

We need git hooks to enforce quality gates at commit time (fast, file-scoped lint) and push time (slow, project-wide typecheck + test). The solution must auto-install on `pnpm install` without manual setup.

## Decision drivers

- Auto-install on `pnpm install` via `prepare` lifecycle
- Staged-file filtering without lint-staged
- Minimal dependencies
- `pre-push` runs full typecheck (TypeScript's type graph spans files)

## Considered options

1. **Husky 9.x alone** — de facto Node.js standard, `prepare` lifecycle auto-install
2. **Husky + lint-staged** — classic combo, but lint-staged is redundant with Biome `--staged`
3. **lefthook** — faster, but adds a non-Node binary dependency; speed advantage irrelevant at our scale

## Decision outcome

**Chosen option: Husky 9.x alone** — Husky auto-installs hooks via `"prepare": "husky"` in package.json. Biome's native `--staged` mode handles staged-file filtering, making lint-staged unnecessary. Hook split:

- `pre-commit` (fast): `biome check --staged --write` + `git update-index --again`. The `git update-index --again` is critical: without it, Biome's `--write` fixes on partially-staged files go to the working tree but the staged blob keeps the unfixed content, silently shipping unfixed code.
- `pre-push` (slow): `typecheck && test`. Full-project typecheck is mandatory because TypeScript's type graph spans files; staged-only typecheck produces misleading results.

### Positive consequences

- Zero manual hook setup for contributors
- No lint-staged dependency (~30 fewer transitive packages)
- `git update-index --again` ensures Biome fixes actually make it into the commit

### Negative consequences / trade-offs

- Husky ~5M weekly downloads but still an extra dev dependency
- lefthook's performance advantage is sacrificed (irrelevant at single-package scale)

## Links

- [Husky docs](https://typicode.github.io/husky/)
