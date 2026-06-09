# quotation

## Purpose

Renders a quoted body of text with an optional right-aligned attribution line.
Two-slot visual grammar: italic body above, attribution (prefixed with an em
dash) right-aligned below.

## Data schema

```ts
{
  text:          string;   // required — the quote body; rendered italic, wrapped in curly quotes
  attribution?:  string;   // optional — byline rendered right-aligned below, prefixed with "— "
}
```

All fields validated by Zod. No `.default()` in the schema — input and output
types are identical.

## Examples

```jsonc
// Minimal — quote body only
{
  "blockType": "quotation",
  "data": {
    "text": "Simplicity is the ultimate sophistication."
  }
}
```

```jsonc
// Typical — quote with attribution
{
  "blockType": "quotation",
  "title": "Quote of the day",
  "data": {
    "text": "An investment in knowledge pays the best interest.",
    "attribution": "Benjamin Franklin"
  }
}
```

```jsonc
// Edge — multi-sentence quote with full attribution
{
  "blockType": "quotation",
  "title": "Morning thought",
  "data": {
    "text": "The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming tasks into small manageable tasks.",
    "attribution": "Mark Twain"
  }
}
```

## Layout notes

The block renders a vertical flex column (gap 4 px, 8 px padding, 18 px font
size). The quote body is wrapped in typographic curly-double-quotes by the
render function (`"${data.text}"`) and styled `fontStyle: italic`. Attribution
is rendered in a full-width flex row with `justifyContent: flex-end`, producing
the right-aligned em-dash byline. Long quotes wrap naturally; the effective
content width is 528 px (576 px receipt − 2×24 px shell padding). The
`BlockShell` adds 16 px vertical padding at the `normal` setting. The block
ships with `showTitle: true` and a `thin` (1 px) bottom separator by default.

## See also

- **textCell** — use for arbitrary body text that does not need the italic +
  attribution visual grammar; supports fontSize and alignment variants.
- **kpi** — use when the prominent content is a numeric or scalar value rather
  than a prose quotation.

## Theme-controlled dimensions

| Field | Slot | Default |
|---|---|---|
| `text` | `emphasis` | `{}` |
| `attribution` | `label` | `{ fontSize: 16 }` |

## Block-local intent

| Field | Property | Value | Why |
|---|---|---|---|
| `text` | `fontStyle` | `"italic"` | Identity: quotation text is always italic |
