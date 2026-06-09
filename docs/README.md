# Documentation

Three trees serve three audiences:

- **[`docs/guide/`](./guide/)** — Adopter-facing. Start here if you're integrating `pressedslip` into a project.
- **[`docs/architecture/`](./architecture/)** — Maintainer-facing. Internals, invariants, and the per-entity reference diagrams.
- **[`docs/api/`](./api/)** — Public API map plus auto-generated TypeScript API reference under `docs/api/reference/`. The TypeDoc HTML is regenerated via `pnpm docs:api`; generated HTML is not committed.

Other folders (`docs/adrs/`, `docs/blocks/`, `docs/themes/`, `docs/assets/`) hold architecture decisions, per-block reference pages, theme documentation, and shared assets respectively.
