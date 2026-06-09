# ADR-0012: Block taxonomy — visual shapes, not content sources

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 1 (consequences to sub-project 2)
- **Tags:** api-surface, blocks, dx

## Context and problem statement

A print-layout library that ships a "weather" block is no longer a print-layout library — it is a weather widget that happens to print. The visual shape (a key-value grid with an icon column) is generic and reusable. The data source (open-meteo API, a specific JSON schema) is specific to one application's content pipeline. Conflating the two means every non-weather consumer carries weather-shaped assumptions in their dependency tree, and every weather consumer is locked into this library's opinion about how weather data is structured.

This distinction matters because the library's primary reference implementation, marplanner, ships 18 content-source blocks (weather, dadJoke, animalFact, meals, etc.). The question is whether those blocks — or a version of them — belong in `pressedslip`.

## Decision drivers

- A library that ships domain-specific content sources (weather, dad jokes, meal plans) couples itself to one application's content pipeline
- The visual shapes those content sources produce (key-value grid, list, stat card) ARE general-purpose print primitives
- The `defineBlock` API exists specifically to let consumers define their own content-source blocks without requiring library changes
- Marplanner's 5 marplanner-specific blocks (birthday, meals, reminders, shotgun, streak) are not general-purpose even as visual shapes; they belong consumer-side regardless

## Considered options

1. **Lift marplanner's 18 blocks** — ship all 18 content-source blocks as builtins; consumers get a ready-made marplanner-compatible block set
2. **Visual-shape catalog (~5–7 blocks)** — ship generic visual primitives (`textCell`, `list`, `table`, `kpi`, `divider`, etc.); consumers define their own content-source blocks via `defineBlock`

## Decision outcome

**Chosen option: visual-shape catalog** — the package ships visual-shape blocks only. Marplanner's content-source blocks become consumer-side definitions, written in marplanner using the public `defineBlock` API at sub-project 8 migration time. Sub-project 1 ships 2 stub builtins (`textCell`, `list`) sufficient to exercise the full API surface end-to-end; the complete ~5–7 visual-shape catalog is sub-project 2's deliverable.

### What "visual shape" means

A visual-shape block answers the question "what does the rendered output look like?" — a cell with a title and body text, a bulleted list, a two-column key-value table, a stat card with a large number. A content-source block answers "where does the data come from and how is it structured?" — weather data from open-meteo, dad jokes from icanhazdadjoke, meals from a meal-plan database.

The library owns visual shapes. Consumers own content sources.

### Where marplanner's 18 blocks land

| Category | Blocks | Landing |
|---|---|---|
| Marplanner-specific | birthday, meals, reminders, shotgun, streak | Consumer-side in marplanner via `defineBlock` |
| General visual shapes | today, message, weather (kv-grid), dadJoke (textCell), etc. | Expressible via sp2's visual-shape catalog |

The pre-condition gate (Decision #9 obligation) validates that all 18 blocks are expressible via the public `defineBlock` API before sub-project 1 is declared done.

### Positive consequences

- Library stays domain-agnostic; any print consumer can adopt it without weather/jokes/meal-plan assumptions
- Marplanner's migration is additive: it defines its own blocks using the same API as any other consumer
- Visual-shape catalog is the right abstraction layer for sp2's full builtin set

### Negative consequences / trade-offs

- Marplanner's sub-project 8 migration requires writing `defineBlock` definitions for all 18 blocks consumer-side (non-trivial but correct separation)
- Sub-project 1 ships only 2 stub builtins; the full catalog waits for sub-project 2

## Links

- [ADR-0009: Bounded-hybrid migration strategy](0009-bounded-hybrid-migration.md)
- [ADR-0011: Public API shape](0011-public-api-shape.md)

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
