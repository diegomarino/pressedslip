# Word of the Day

Picks today's word by day-of-year from a corpus of 30 evocative words and
renders it through a **custom block** defined inline via `defineBlock`. The
block lays out five fields (word, type, pronunciation, definition, example)
mapped to the theme's `display`, `label`, `body`, and `emphasis` slots.

**Block**: custom `wordOfDay` (defined in-file).
**Generator**: pure-offline. No fetch.
**Theme**: pressedslip default, extended via `defineTheme` to load one extra
font face (Inter italic 400). Satori requires the matching face to be loaded
before `fontStyle: "italic"` can actually slant — without it the override
silently falls back to upright.

## Run (Node)

```sh
pnpm example:word-of-day
```

Writes `examples/word-of-day/output.png` (gitignored).

The Node version is a `.tsx` file because the block render returns JSX.
`tsx` (the runner) uses the classic JSX transform by default, so `React` is
imported explicitly.

## Run (browser)

Open `examples/word-of-day/example.html` in any modern browser. The PNG
renders automatically on page load. The browser version uses
`React.createElement` directly (no JSX, no build step) — same block shape,
different syntax.

## What this teaches

- Extending pressedslip with `defineBlock` — the public API for custom blocks.
- Reading theme `textStyles` slots via `applyTextStyle(...)` so the block
  remains theme-aware.
- The block lives next to the consumer code (one folder, no library
  modifications) — the most common adopter pattern.
- The Node `.tsx` and the browser `.html` show two ways to write the same
  block: JSX (Node, with React import) and `React.createElement` (browser, no
  build step).
