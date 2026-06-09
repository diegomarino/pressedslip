# ADR-0026: TextStyle mapping for multi-field structured blocks

- **Status:** accepted
- **Date:** 2026-05-29
- **Deciders:** diego (sp8c brainstorming + spec + writing-plans, peer-reviewed via codex blind-debate)
- **Sub-project:** 8 (sp8c)
- **Tags:** theme, api-surface, governance

## Context and problem statement

Sp8b established 6 canonical `TextStyles` slots (`body`, `emphasis`, `display`, `label`, `question`, `answer`) plus an `extras: Record<string, TextStyle>` escape hatch on `ShellTheme`. Blocks with N > 2 typographically differentiated fields (word-of-day with 5 fields; anticipated future blocks: entry-card, fact-with-source, definition-list) need a rule for choosing a canonical slot vs `extras`. Sp8c needs to render `word-of-day` with `word`, `type`, `definition`, `example?`, `pronunciation?` — five fields each wanting a distinct treatment. Without a rule, block authors will either invent ad-hoc `extras` keys per field (`extras.word`, `extras.type`, …, defeating the canonical slots) or overload canonical slots inconsistently across themes.

## Decision drivers

- Canonical slots must remain stable across blocks so theme providers can reason about them centrally.
- The `extras` escape hatch must absorb novelty without polluting the main shape.
- Block authors need a deterministic rule to apply at slot-assignment time.
- Future blocks (word-search, future word-of-day cousins) must inherit the same rule.

## Considered options

1. **Per-field canonical promotion** — for every new field type, add a 7th/8th/Nth canonical slot.
2. **Numbered escape hatches (`data2`, `data3`)** — generic numbered slots beyond the canonical six.
3. **Canonical-first-then-extras** — prefer a canonical slot if a semantic fit exists; use `extras.<key>` only when no canonical match.

## Decision outcome

**Chosen option: Canonical-first-then-extras.** This rule provides a stable decision boundary for block authors while keeping the canonical surface intentionally lean. The four decision rules below operationalize the choice; word-of-day is the first concrete application.

### Decision rules

1. **Prefer a canonical slot if a semantic fit exists.** Don't introduce `extras.body2`. If a field is conceptually "the body content", use `body`.
2. **Use `extras.<key>` for fields without a semantic canonical match.** Example: `pronunciation` (phonetic guide — not `label` and not `emphasis`). Future candidates with the same property: `phonetic`, `etymology`, `citation`.
3. **Reuse canonical slots across fields only when visual treatment is identical.** If two fields would share exactly the same `TextStyle` properties, share the slot. If they differ in any property (size, weight, color), separate.
4. **`extras` keys are block-namespaced conceptually.** The same key name in two different blocks may carry different intent; theme providers document which blocks use which `extras` keys.

### Application — word-of-day (sp8c)

| Field | Slot | Reasoning |
|---|---|---|
| `word` | `display` | Headword — visually dominant, large type. |
| `type` | `label` | Short categorical metadata ("adjective", "noun"). |
| `definition` | `body` | Primary content, paragraph-style. |
| `example` | `emphasis` | Italic-leaning supportive text. |
| `pronunciation` | `extras.pronunciation` | Phonetic guide — no canonical semantic match. |

### Positive consequences

- Canonical slots remain stable across blocks.
- `extras` absorbs novelty without polluting the main shape.
- ADR provides a clear rule for sp8c.5 (word-search) and future blocks.

### Negative consequences / trade-offs

- Block authors must justify each new `extras` key in review.
- No automated enforcement against `extras` bloat.

## Pros and cons of the options

### Option 1 (Per-field canonical promotion)

- ✅ Type-level discoverability — every field is autocompletable.
- ❌ Canonical surface bloats with each new block type; loses semantic coherence.
- ❌ Single-block fields pre-commit the API to one block's needs.

### Option 2 (Numbered escape hatches)

- ✅ Simpler than ad-hoc keys.
- ❌ Numeric names carry no semantics; reviewers cannot judge appropriateness without reading the consuming block.

### Option 3 (Canonical-first-then-extras)

- ✅ Stable canonical surface + clear rule for novelty.
- ✅ Block-namespaced extras keep cross-block intent isolated.
- ❌ No type-level enforcement against typos in extras keys (mitigated by ADR review gate).

## Future governance

When an `extras` key appears in 3+ blocks across the catalog, consider promoting it to a canonical slot via a pressedslip minor version bump. Revisit at sp9 (publish gate) or when `extras` accumulates.

## Links

- `docs/adrs/0025-theme-text-role-vocabulary.md` — sp8b ADR (established canonical-slot vocabulary)
- Word-of-day generator (marplanner): `apps/api/src/lib/daily-briefing/blocks/word-of-day.ts`

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
