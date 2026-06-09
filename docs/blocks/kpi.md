# kpi

## Purpose

Renders a stat-card: a large prominent value with an optional label above and
an optional caption below. Domain-agnostic (ADR-0012) — consumers compose it
for weather, finance, streaks, word counts, or any scalar metric.

## Data schema

```ts
{
  value:    string;   // required — the primary stat displayed at 36 px bold
  label?:   string;   // optional — uppercase eyebrow line at 14 px above value
  caption?: string;   // optional — subdued annotation at 12 px below value
}
```

All fields validated by Zod. No `.default()` in the schema — input and output
types are identical.

## Examples

```jsonc
// Minimal — value only
{
  "blockType": "kpi",
  "data": {
    "value": "23°C"
  }
}
```

```jsonc
// Typical — label + value + caption
{
  "blockType": "kpi",
  "title": "Temperature",
  "data": {
    "label": "Current",
    "value": "23°C",
    "caption": "Feels like 21°C — partly cloudy"
  }
}
```

```jsonc
// Edge — value-only streak counter, no label or caption
{
  "blockType": "kpi",
  "title": "Writing streak",
  "data": {
    "value": "47 days"
  }
}
```

## Layout notes

The block renders a full-width vertical flex column (gap 2 px, 8 px padding).
`label` is rendered in uppercase with 1 px letter-spacing, creating a restrained
eyebrow treatment that keeps it visually subordinate to `value`. `value` renders
at 36 px bold with `lineHeight: 1.1` to tighten vertical rhythm. `caption`
uses the theme's `label` slot below the value. Omitting
`caption` collapses the layout to two lines; omitting both `label` and `caption`
leaves only the value. The surrounding `BlockShell` adds 24 px horizontal and
16 px vertical padding at the `normal` setting; default receipt width is 576 px.

## See also

- **textCell** — use for arbitrary body text without the stat-card visual
  hierarchy (no large central value).
- **keyValue** — use when you need a label paired with a value at equal
  typographic weight and smaller scale (14 px / 18 px), rather than the 36 px
  dominant value of kpi.

## Theme-controlled dimensions

Font size and font family are controlled by the theme's `textStyles` slots.

| Field | Slot | Default |
|---|---|---|
| `label` | `label` | `{ fontSize: 14 }` |
| `value` | `display` | `{ fontSize: 36, lineHeight: 1.1 }` |
| `caption` | `label` | `{ fontSize: 16 }` |

## Block-local intent

| Field | Property | Value | Why |
|---|---|---|---|
| `label` | `textTransform` | `"uppercase"` | Eyebrow treatment — visually subordinate to value |
| `label` | `letterSpacing` | `1` | Eyebrow treatment |
| `value` | `fontWeight` | `700` | Identity: stat value is always bold |
