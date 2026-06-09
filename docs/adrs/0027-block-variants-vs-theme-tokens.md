# ADR-0027: Block variants vs theme tokens — decision rule

- **Status:** accepted
- **Date:** 2026-05-30
- **Deciders:** diego (sp8d spec §AC#8 deferred decision; formalized post-execution)
- **Sub-project:** 8 (sp8d)
- **Tags:** theme, block-design, governance

## Context and problem statement

Sp8d shipped two visual-divergence patterns in the same sub-project:

- **Workstream F** introduced `streak-text` and `weather-text` as **new block definitions** alongside their canonical `streak` and `weather` siblings.
- **Workstream G** introduced `listItemBullet` as a **theme token** on `ShellTheme`, defaulted to `"•"` and overridden to `"-"` in `monoTheme`.

Both patterns produce "the same block looks different in a different theme/mode". Without a rule, block authors will pick inconsistently — some will reach for a new block definition where a token would do, others will branch on theme identity (`ctx.theme.id === "mono"`) inside an existing block, violating the sp8c invariant of zero `ctx.theme.id ===` branches under `apps/api/src/blocks/` and `packages/marplanner-theme/src/`.

Sp8d spec §AC#8 framed the rule informally ("two block definitions when structure differs; theme tokens when only a value differs"). This ADR formalizes the framing, surfaces the trade-offs, and records the sp8d application as the canonical example set.

## Decision drivers

- Block variants are heavy: new schema, fixture, generator stub, catalog wiring across 5 surfaces, adapter case.
- Theme tokens are light: one optional field on `ShellTheme` + default in `SHELL_DEFAULTS` + per-theme override + consumer read via `ctx.theme.<token>`.
- Theme-identity branching (`ctx.theme.id === "mono"`) inside a block is rejected outright — leaks theme implementation into block code and breaks composition guarantees.
- Block authors need a deterministic rule at design time, not at review time.
- The catalog stays maintainable only if "variant proliferation" is bounded.

## Considered options

1. **Always block variants** — every visual divergence gets its own block definition.
2. **Always theme tokens (with theme-id branching)** — single block + conditional render on theme identity.
3. **Hybrid by axis of variation** — block variant when the data shape differs; theme token when only an atomic visual value differs within the same render path.

## Decision outcome

**Chosen option: Hybrid by axis of variation.** The decision is governed by the axis on which the variation lives:

### Decision rule

- **If the data shape differs** (different schema fields, different array structures, different optionality), introduce a **new block definition**. Variants are sibling blocks in the catalog, each with its own schema, fixture, generator, and adapter case.
- **If only an atomic visual value differs** (a character, a color, a size, an alignment) *within the same render path and the same schema*, introduce a **theme token** on `ShellTheme` (or `extras` per ADR-0026) and have the block read it from `ctx.theme.<token>`.

### Operative tests

When unsure, apply these in order:

1. **Schema test:** would the two flavors require any different fields, or differ in field optionality? → block variant.
2. **Render-path test:** does one flavor render different JSX structure (not just different style values)? → block variant.
3. **Atomic-swap test:** can the divergence be expressed as one or more atomic value substitutions in the existing render? → theme token. Multiple coordinated tokens consumed by the same render path still count as the token case, not as evidence for a block variant.
4. **Theme-identity branching:** if you find yourself writing `ctx.theme.id ===` inside a block, you are in the wrong pattern — back up and apply rule 1 or 3.

### Application — sp8d catalog

| Divergence | Pattern chosen | Reasoning |
|---|---|---|
| `streak` vs `streak-text` (schemas identical: `{ days, last7, label }`) | block variant | different render paths — `streak` emits graphical `last7` dots; `streak-text` emits a `[x][x][ ][ ]`-style prose row. Test 2 (render-path), not test 1 (schema). |
| `weather` (`{ condition, currentTemperature, tempMin, tempMax, icon }`) vs `weather-text` (`{ current: { temp, condition }, forecast? }`) | block variant | schemas differ field-for-field. Test 1 (schema). |
| `today`, `on-this-day`, `reminders` bullet character (`"•"` default, `"-"` in mono) | theme token (`listItemBullet`) | identical render path; only one character differs |
| Title fill character (`#`) | theme token (`titleFillChar`, pre-sp8d) | same pattern |
| List item gap (8 px default, configurable) | theme token (`listItemGap`, pre-sp8d) | same pattern |

### Positive consequences

- Block authors have a deterministic rule applicable at design time.
- Catalog growth is bounded — atomic visual swaps don't multiply blocks.
- The sp8c invariant (no `ctx.theme.id ===` in block code) is preserved by construction.
- Theme providers can reason about the canonical `ShellTheme` surface centrally without scanning block bodies.

### Negative consequences / trade-offs

- Borderline cases require judgment. Example: a block where most fields are identical but one field is present in flavor A and absent in flavor B — formally rule 1 applies (schema differs), but the cost of a full block variant may feel disproportionate. The rule still applies; the alternative (optional field + theme-token-driven hide/show) leaks visual concerns into the schema and is rejected. Schema fields must carry semantic meaning; a field whose sole purpose is to toggle a presentation mode (hide/show driven by a theme token) conflates data shape with rendering intent.
- Variant proliferation is not auto-enforced. A reviewer must catch "this should have been a theme token" at PR time. Heuristic for reviewers: grep for new `BlockDefinition` registrations whose schema is structurally identical to an existing sibling block — these are candidates for theme-token consolidation rather than a new variant.

## Pros and cons of the options

### Option 1 (Always block variants)

- ✅ Maximum independence per visual flavor; clean PR diffs per flavor.
- ❌ Catalog bloat from atomic swaps (a `today-bullet-dash` block alongside `today` is absurd).
- ❌ Theme-level configuration loses leverage; every theme has to define a sibling block of every base block.

### Option 2 (Always theme tokens with theme-id branching)

- ✅ Single source per concept; minimal catalog.
- ❌ Cannot express schema divergence (the data is the same; theme can't conjure or hide a field).
- ❌ Forces `ctx.theme.id ===` branches inside blocks, violating the sp8c invariant.
- ❌ Theme providers must understand every block's internal flavor logic.

### Option 3 (Hybrid by axis of variation)

- ✅ Right tool for each axis: schema lives in the block, atomic visual values live in the theme.
- ✅ No theme-identity branching anywhere.
- ❌ Requires judgment on borderline cases (mitigated by the four operative tests).

## Future governance

- When a theme token is used by exactly one block, watch for promotion pressure — it may be block state in disguise. Promote to a canonical slot only when 3+ blocks consume it (mirroring ADR-0026's `extras` promotion gate). The 3+ threshold guards against single-consumer tokens that conceptually belong in block state rather than on the theme; once three independent consumers exist, the cross-cutting nature is established and theme-level ownership pays for itself.
- When a block has accumulated 3+ siblings (`X`, `X-text`, `X-compact`, …), revisit whether the proliferation indicates a missing composition primitive. **Any such primitive must NOT take the form of a render-mode prop driven by theme identity** — that is `ctx.theme.id ===` branching by another name and violates the sp8c invariant. Activating a composition primitive that crosses this boundary requires superseding this ADR, not transparent governance evolution. Sp10+ scope.

## Links

- `docs/adrs/0026-textstyle-mapping-multi-field-structured-blocks.md` — companion rule for slot vs `extras` within a single block.
- `docs/adrs/0025-theme-text-role-vocabulary.md` — established the canonical theme-token vocabulary this ADR extends.

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
