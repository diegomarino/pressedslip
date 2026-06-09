# ADR-0028: Built-in block TextStyles migration

- **Status:** accepted
- **Date:** 2026-06-07
- **Deciders:** diego (sp8f brainstorming + spec + writing-plans, peer-reviewed via codex blind-debate)
- **Tags:** theme, text-styles, api-surface, governance

## Context and problem statement

The 6 built-in blocks (`kpi`, `keyValue`, `list`, `qaPair`, `quotation`, `textCell`) hardcoded
font sizes, weights, and visual properties directly in JSX, ignoring `ctx.theme.textStyles`
entirely. This made built-ins visually inconsistent next to sp8e showcase blocks (which are
theme-responsive), and would lock consumers into broken behavior once published — migration
to TextStyles post-publish would be a breaking change.

The most visible symptom: `kpi.caption` at `opacity:0.7` was unreadable in low-contrast
themes during playground preview.

## Decision drivers

- Breaking schema changes must land before the first publish; this was a pre-publish window.
- Visual parity: unthemed render with default theme must look identical to the themed render.
- Intent inviolability: blocks declare typographic identity; themes must not be able to attenuate it.
- No new public API surface in sp8f.

## Decisions

### Decision X — Layer ownership

| Owner | Properties |
|---|---|
| **Slot** (`ctx.theme.textStyles.<slot>`) | `fontSize`, `color`, `fontFamily` (via `fontRole`), `lineHeight`, `fontWeight` (when nuance) |
| **Block** | `textTransform`, `fontStyle`, `letterSpacing`, multipliers, `fontWeight` (when identity-defining) |

Block-local intent properties spread **after** the slot result: `{ ...slotStyle, ...intentProps }`. This
ensures theme cannot override intent — a `quotation.text` will always be italic regardless of
what `emphasis.fontStyle` is set to.

### Decision R — Remove `textCell.fontSize` schema field

`textCell` previously accepted `fontSize: "small"|"regular"|"large"` which mapped to hardcoded
pixel values. Since this is the font-size axis and font size is now owned by the `body` slot,
the field is removed. Consumers who need size variation can use theme variants or compose
different blocks. This is a breaking schema change, accepted pre-publish.

### Slot mapping (canonical)

| Block | Field | Slot | Block-local intent |
|---|---|---|---|
| **kpi** | `label` | `label` | `textTransform:"uppercase"`, `letterSpacing:1` |
| | `value` | `display` | `fontWeight:700` |
| | `caption` | `label` | `fontSize: Math.round((label.fontSize ?? 14) * 0.85)`, `color:"#666"` |
| **keyValue** | `label` | `label` | `fontWeight:700` |
| | `value` | `body` | — |
| **list** | `group.title` | `emphasis` | `fontWeight:700` |
| | `item.id` | `emphasis` | `fontWeight:700` + layout (`paddingRight`, `flexShrink:0`) |
| | `item.value` | `body` | — |
| **qaPair** | `question` | `question` | — |
| | `answer` | `answer` | — |
| **quotation** | `text` | `emphasis` | `fontStyle:"italic"` |
| | `attribution` | `label` | — |
| **textCell** | `text` | `body` | — |

### Pass-through defaults

`TEXT_STYLES_DEFAULTS` baseline values — these ensure an unthemed render looks reasonable without a theme applied:

| Slot | Default |
|---|---|
| `body` | `{ fontSize: 16 }` |
| `emphasis` | `{}` |
| `display` | `{ fontSize: 36, lineHeight: 1.1 }` |
| `label` | `{ fontSize: 14 }` |
| `question` | `{ fontSize: 18 }` |
| `answer` | `{ fontSize: 18 }` |

`pressedslip-theme` and `marplanner-theme` continue to override with their production typographic stack.

## Consequences

- All 6 built-in blocks now respond to theme `textStyles` changes without any consumer-side code change.
- `textCell.fontSize` removed: consumers must update data (remove the field; TypeScript will catch it).
- `kpi.caption` changes from `opacity:0.7` to `color:"#666"` — visually similar, more predictable on low-contrast themes.
- Baseline snapshots for all 6 blocks regenerated.
- `intent-inviolability.test.tsx` added as regression gate.
