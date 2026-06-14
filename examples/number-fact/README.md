# Number Fact

Picks today's number trivia by `new Date().getDate()` from a corpus of 31
hand-written facts (one per day of the month) and renders it through the
built-in `kpi` block.

**Block**: `kpi` (built-in) — value is the day number, caption is the fact.
**Generator**: pure-offline. No fetch.
**Theme**: pressedslip default. No customization.

## Run (Node)

```sh
pnpm example:number-fact
```

Writes `examples/number-fact/output.png` (gitignored).

## Run (browser)

Open `examples/number-fact/example.html` in any modern browser. The PNG is
rendered automatically on page load — client-side via the `/browser` subpath

+ `@resvg/resvg-wasm` from `esm.sh`. A download link appears beneath the
preview.

## What this teaches

+ Building a `CompositionInput` by hand (no `compose()` orchestrator needed
  for a single, deterministic slot).
+ Mapping a local corpus to a built-in block — the simplest pressedslip recipe.
+ The Node entry (`pressedslip`) and the browser entry (`pressedslip/browser`)
  have the same API surface; the only difference is the browser render
  requires a `wasm` option.
