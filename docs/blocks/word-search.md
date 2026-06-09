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

1. **Grid container** — a column-flex `<div>` with a 1px solid border colored
   by `ctx.theme.separatorColor`. Each row is a row-flex `<div>` containing
   one 24×24px cell per character.
2. **Word list** — a row-flex `<div>` with `marginTop: 8` and two `flex: 1`
   column children. Words are split left-heavy: the left column receives
   `Math.ceil(words.length / 2)` words, the right column the remainder.
   A 5-word list → 3 left + 2 right.

Cells have no inter-cell borders or gaps — uniform adjacency is required for
diagonal word tracing.

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
| Grid cells | `fontSize` | `20` | Identity: fixed cell size (24px) calibrated for 20px mono |
| Grid cells | `width` / `height` | `24` / `24` | Identity: fixed pixel cells prevent stretch on small grids |
