# textCell

## Purpose

Renders a single body of text with optional horizontal alignment. Font size and
font family come from the active theme's `body` text style.

## Data schema

```ts
{
  text:    string;               // required — the text to display
  align?:  "left"                // optional — default
         | "center"
         | "right"
         | "justify";            // degrades to left (no flex equivalent)
}
```

All fields validated by Zod. No `.default()` in the schema — both input and
output types are identical.

## Examples

```jsonc
// Minimal — one required field only
{
  "blockType": "textCell",
  "data": {
    "text": "Good morning."
  }
}
```

```jsonc
// Typical — centered line
{
  "blockType": "textCell",
  "title": "Daily Note",
  "data": {
    "text": "Week 21 — no meetings today",
    "align": "center"
  }
}
```

```jsonc
// Edge — right-aligned footnote
{
  "blockType": "textCell",
  "data": {
    "text": "Source: OpenWeatherMap, updated 06:00 UTC",
    "align": "right"
  }
}
```

## Layout notes

The block renders a full-width `display:flex` row with 8 px padding. Alignment
is implemented via `justifyContent` on the row (not `textAlign` on the span),
because satori does not reliably honor `textAlign` inside a parent flex
container. The `justify` value has no flex equivalent and silently degrades to
`left`. At the default receipt width of 576 px the block expands to fill the
content area; long strings wrap naturally. The surrounding `BlockShell` adds
24 px horizontal padding and configurable vertical padding (`normal` = 16 px
top/bottom by default), so effective content width is 576 − 2×24 = 528 px.
When `showTitle` is enabled in the shell options, a title strip appears above
the content area; `textCell` ships with `showTitle: true` and a `thin`
(1 px) bottom separator by default.

## See also

- **kpi** — use when the text is a large numeric value that should dominate the
  card visually with an optional label and caption.
- **quotation** — use when the text is a cited quote that needs italic styling
  and an optional right-aligned attribution line.

## Theme-controlled dimensions

| Field | Slot | Default |
|---|---|---|
| `text` | `body` | `{ fontSize: 16 }` |

## Block-local intent

None. The `align` field controls layout, while typography is theme-controlled.
