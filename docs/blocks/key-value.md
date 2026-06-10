# keyValue

## Purpose

Renders a single label/value pair with typographic emphasis on the label.
Cardinality-1 counterpart to `list` — fixed two-field structure, no array,
no groups.

## Data schema

```ts
{
  label: string;   // required — bold label rendered at 16 px above value
  value: string;   // required — body value rendered at 20 px regular weight below
}
```

Both fields are required. Validated by Zod. No optional fields.

## Examples

```jsonc
// Minimal — both fields required
{
  "blockType": "keyValue",
  "data": {
    "label": "Sunrise",
    "value": "06:23"
  }
}
```

```jsonc
// Typical — metadata row inside a composed receipt
{
  "blockType": "keyValue",
  "title": "Next event",
  "data": {
    "label": "Team standup",
    "value": "09:00 — Google Meet (recurring)"
  }
}
```

```jsonc
// Edge — long value that wraps across multiple lines
{
  "blockType": "keyValue",
  "data": {
    "label": "Today's focus",
    "value": "Finish the quarterly report draft, review the design feedback, and prepare the slides for Monday"
  }
}
```

## Layout notes

The block renders a vertical flex column (gap 2 px, 8 px outer padding).
`label` uses the theme's `label` slot with `fontWeight: 700`; `value` uses the
theme's `body` slot below. The 700-weight label requires the consumer to load a weight-700
font face; without one, Satori silently falls back to the nearest available weight. Long
`value` strings wrap within the 528 px effective content width (576 px receipt
− 2×24 px shell padding). The `BlockShell` adds 16 px vertical padding at the
`normal` setting and a `thin` (1 px) bottom separator by default.

## See also

- **list** — use when you have multiple label:value pairs or need group
  headings; `list` accepts `groups[].items[].{id, value}` arrays.
- **kpi** — use when the value is a prominent scalar metric that should render
  at 36 px bold with an optional eyebrow label and caption.

## Theme-controlled dimensions

| Field | Slot | Default |
|---|---|---|
| `label` | `label` | `{ fontSize: 16 }` |
| `value` | `body` | `{ fontSize: 20 }` |

## Block-local intent

| Field | Property | Value | Why |
|---|---|---|---|
| `label` | `fontWeight` | `700` | Identity: key in a key/value pair is always bold |
