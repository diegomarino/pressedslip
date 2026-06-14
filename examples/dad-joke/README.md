# Dad Joke

Picks today's joke by day-of-year mod `corpus.length` from a corpus of 30
inline jokes and renders it through the built-in `qaPair` block.

**Block**: `qaPair` (built-in) — setup → question, punchline → answer.
**Generator**: pure-offline. No fetch.
**Theme**: pressedslip default. No customization.

## Run (Node)

```sh
pnpm example:dad-joke
```

Writes `examples/dad-joke/output.png` (gitignored).

## Run (browser)

Open `examples/dad-joke/example.html` in any modern browser. The PNG renders
automatically on page load; the download link appears beneath the preview.

## What this teaches

- Day-of-year picker pattern: deterministic per day, cycles annually
  regardless of corpus size.
- Built-in `qaPair` for any setup/payoff content — companion to `riddle`,
  which uses the same block plus a theme trick.
