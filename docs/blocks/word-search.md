# word-search

## Purpose

Renders a word-search puzzle grid: a fixed-size monospace grid of single
uppercase characters with a list of hidden words displayed in two columns
below. Render-only — grid construction and word placement are the caller's
responsibility.

Designed as an architectural stress-test for `defineBlock`, `TextStyle`, and
Satori's flex layout model (up to 144 nested divs for a 12×12 grid). See
[ADR-0028](../adrs/0028-textstyles-builtin-migration.md) for context.

## Data schema

```ts
{
  grid:  string[][];  // NxM matrix of single uppercase chars, 6–12 rows, 6–12 cols, rectangular
  words: string[];    // min 1 word, displayed below the grid in two columns
}
```

Validated by Zod with a `.refine()` cross-field invariant: every row must have
the same length (rectangular), and column count must be 6–12. Row count is
independently constrained to 6–12 by Zod's `.min(6).max(12)`.

## Examples

```jsonc
// Minimal — 6×6 grid, 4 words
{
  "blockType": "wordSearch",
  "title": "Word Search",
  "data": {
    "grid": [
      ["D", "A", "R", "T", "B", "C"],
      ["F", "C", "A", "T", "G", "H"],
      ["D", "O", "G", "L", "M", "N"],
      ["S", "U", "N", "P", "Q", "R"],
      ["B", "C", "F", "V", "W", "X"],
      ["Y", "Z", "B", "C", "D", "F"]
    ],
    "words": ["DART", "CAT", "DOG", "SUN"]
  }
}
```

## Layout notes

The block renders a column-flex wrapper (`alignItems: "center"`) so small grids
are centered on the full paper width. Inside it:

1. **Grid container** — a column-flex `<div>` that draws the top + left edges in
   `ctx.theme.separatorColor`. Each row is a row-flex `<div>` of square cells
   sized to a NORMAL target (so the grid *grows* with the column count rather than
   filling a fixed width), shrinking only when the grid would overflow the available
   content width — see [Block-local intent](#block-local-intent). Every cell draws
   its own right + bottom edge, so shared edges render as a single 1px ruled line,
   separating every row and column.
2. **Word list** — a row-flex `<div>` with `marginTop: 8` and two `flex: 1`
   column children. Words are split left-heavy: the left column receives
   `Math.ceil(words.length / 2)` words, the right column the remainder.
   A 5-word list → 3 left + 2 right.

Cells are ruled by 1px gridlines (drawn via the container's top/left edges and
each cell's right/bottom edge) with no gaps. Because Satori defaults to
`box-sizing: border-box`, the inset borders do not change cell dimensions, so
uniform adjacency — required for diagonal word tracing — is preserved.

## See also

- **list** — use when you need a plain word or item list without the grid.
- **textCell** — use for arbitrary body text.

## Theme-controlled dimensions

| Element | Slot | Default |
|---|---|---|
| Word list items | `body` | `{ fontSize: 20 }` |
| Grid border color | `separatorColor` (ShellTheme field) | `"#333"` |

## Block-local intent

The grid cells deliberately bypass the `TextStyle` slot system. This is
**identity intent**: monospace alignment is non-negotiable for a word-search
puzzle. Theme font roles do not apply to cells.

| Element | Property | Value | Why |
|---|---|---|---|
| Grid cells | `fontFamily` | `"JetBrains Mono"` | Identity: monospace required for diagonal word tracing |
| Grid cells | `width` / `height` | `clamp(floor((ctx.contentWidth − 16) / cols), 16, 36)` | Identity: square cells at a NORMAL 36px target; the grid grows with column count and only shrinks (to a 16px floor) if it would overflow `ctx.contentWidth` (usable width inside shell padding) minus this block's own 16px wrapper padding |
| Grid cells | `fontSize` | `Math.round(cellSize * 21 / 24)` | Identity: font tracks cell size at the calibrated 21/24 ratio (≈0.875) to preserve glyph fit |
