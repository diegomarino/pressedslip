# ADR-0011: Public API shape — root-only entry, 25 named exports

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo), validated by Codex peer-review (finding F4)
- **Sub-project:** 1
- **Tags:** api-surface, dx

## Context and problem statement

Before a library has real consumers, defining subpath export topology locks in package structure decisions that are hard to reverse. Every subpath export (`/transports`, `/browser`, `/testing`) is an implicit commitment about which code belongs in which bundle — and about which consumers need which code. Making those decisions before the first consumer exists means they are made from audit-of-a-source-app reasoning, not from real usage signals. This decision fixes what ships from the package root in sub-project 1 and records what is deferred.

## Decision drivers

- Subpath exports lock package topology before any consumer has validated the split is the right one
- Root-only lets API shape evolve with real usage (a new subpath can be added additively; an existing subpath cannot be removed without a major version)
- The audit disposition table (spec §Implementation obligations) covers 10+ marplanner-derived findings; the design addresses them through type and function design, not through topology
- Peer-review finding F4: builtin blocks (`textCellBlock`, `listBlock`) must be exported individually (not just aggregated in `builtinBlocks`) so consumers can partial-override

## Considered options

1. **Subpath exports on day 1** — ship `/transports`, `/browser`, `/blocks`, `/testing` from sub-project 1
2. **Root-only entry** — all 25 exports from `"pressedslip"`, no subpaths in sub-project 1

## Decision outcome

**Chosen option: root-only entry** — all exports come from `"pressedslip"` (the package root). No subpath exports in sub-project 1. Subpath topology is deferred to the sub-projects that need each domain (sp4 for transports, sp5 for browser-safe entry). The 25 named exports cover the complete render-core API surface: the `render`/`defineBlock`/`createRegistry` triad, font loaders, logger factory, builtin block stubs, `PAPER` constants, and all public types.

### The 25 named exports

**Functions and constants (10):** `render`, `createRegistry`, `defineBlock`, `loadFontFromBuffer`, `loadFontFromUrl`, `createConsoleLogger`, `textCellBlock`, `listBlock`, `builtinBlocks`, `PAPER`.

**Types (15):** `Composition`, `Subject`, `Block`, `BlockDefinition`, `BlockDefinitionSpec`, `BlockShellOptions`, `Registry`, `Rendering`, `FailedBlock`, `RenderOptions`, `RenderContext`, `Logger`, `LoadedFont`, `WidthSpec`, `PaperPreset`.

The audit disposition table in the spec maps each relevant marplanner audit finding to the specific type or function in this surface that addresses it. ADR-0011 references that table rather than restating it.

### Positive consequences

- Package topology can evolve additively as real consumer needs emerge (sp2–sp7)
- No consumer-facing breakage risk from re-topologizing an over-eager subpath export
- `textCellBlock` and `listBlock` exported individually (per F4): consumers can spread `builtinBlocks` and override just one builtin without re-declaring the other

### Negative consequences / trade-offs

- Root bundle includes all exports; tree-shaking is the consumer's responsibility until subpaths land
- Subpath consumers (e.g., browser-only apps that want `/browser`) will need to wait until sub-project 5

## Links

- [ADR-0010: Naming conventions](0010-naming-conventions.md)
- [ADR-0008: Quality bar — no default exports rule](0008-quality-bar-never-rules.md)

### Extended by later sub-projects (forward pointers, append-only)

- **sp2 (2026-05-21)** — added 4 block exports (`keyValueBlock`, `kpiBlock`, `qaPairBlock`, `quotationBlock`), 1 type export (`AnyBlockDefinition`), and the first subpath export `"pressedslip/testing"` (fixtures only, not semver-public on scenario-key names). Authoritative source for the post-sp2 surface: [glossary](../glossary.md). The "no subpaths in sub-project 1" framing of this ADR remains historically accurate.

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
