---
name: pressedslip
description: Compose and render printable slips (thermal receipts, daily briefings, kids' morning sheets, puzzles, shopping lists, tickets) with the pressedslip library, and optionally print them on an ESC/POS thermal printer. Use when the user wants a printable slip, receipt-style printout, daily briefing or thermal-printer output, or mentions pressedslip.
---

# pressedslip

pressedslip turns a JSON **composition** (a list of content blocks) into a
1-bit PNG sized for thermal paper, and can send that PNG to a network
thermal printer. You write the data; the library does layout, fonts and
dithering.

```json
{
  "date": "2026-11-19",
  "subject": { "id": "lisa", "name": "Lisa" },
  "meta": { "language": "en" },
  "slots": [
    { "blockType": "kpi", "title": "WEATHER", "data": { "label": "MADRID", "value": "16° / 9°", "caption": "Rain 80%" } },
    { "blockType": "qaPair", "title": "RIDDLE", "data": { "question": "What has keys but can't open locks?", "answer": "A piano." } }
  ]
}
```

`<skill>` below is the directory containing this file.

## Workflow

1. **Set up.** Node ≥ 22.12 and network access (fonts download from Google
   Fonts on first use). Nothing else is needed for builtin blocks:
   `render.mjs` uses the project's `pressedslip` if it has one, and otherwise
   installs it once into `~/.cache/pressedslip-skill` without touching the
   user's folder. Install it in the project (`npm install pressedslip react zod`,
   with the project's package manager) only when you write custom blocks or
   themes, or when the user is building on pressedslip anyway.
2. **Plan the slip.** Decide what goes on it and in which order. One idea per
   block, short titles in capitals. Pick builtin blocks first:
   [references/blocks.md](references/blocks.md) lists them with their data
   shapes. Most slips need no custom code.
3. **Gather the data.** You are the data generator: write the text yourself,
   fetch it from an API, compute it, or read it from the user's files and
   tools. [references/data-patterns.md](references/data-patterns.md) has
   worked examples (seeded daily picks, live APIs with fallbacks, dates and
   calendars, emoji pictures, streaks).
4. **Write the composition** in the user's project, named after the output
   (`morning.json` → `morning.png`) so you don't overwrite another slip.
   JSONC comments are fine. Write all text in the reader's language.
   For a word search, never type the grid yourself; generate it:
   `node <skill>/scripts/word-search.mjs --words cat,dog,owl --title "WORD SEARCH" --into slip.json`
   (see [Word search](#word-search)).
5. **Render**, from the project directory:
   `node <skill>/scripts/render.mjs slip.json -o slip.png`
   It prints a JSON report (`failedBlocks`, `canvasOverflow`, size) and exits
   1 if any block failed.
6. **Check the result.** Fix every `failedBlocks` entry (the reason names the
   bad field) and any `canvasOverflow`, then render again. Then **look at the
   PNG**: text cut off, empty blocks, grey that vanished, a slip far too long
   for the paper. Iterate until it looks right, then show it to the user.
7. **Print only when the user asks**, and only to the printer they name:
   `node <skill>/scripts/render.mjs slip.json --print 192.168.1.50:9100`.
   Printing uses paper and can't be undone, so don't do it to test.

## render.mjs options

| Option | Default | Notes |
|---|---|---|
| `-o out.png` | input name with `.png` | |
| `--paper` | `thermal80` | `thermal58` (384 px), `thermal80` (576 px), `thermal110` (832 px) |
| `--theme` | `default` | `default`, `compact`, `mono`, or a module path exporting `theme` |
| `--upside-down-answers` | off | Prints every `qaPair` answer upside down (riddles, quizzes) |
| `--blocks mod` | none | Module exporting `blocks: BlockDefinition[]`; repeatable. Run with `npx tsx` for `.ts`/`.tsx` |
| `--print host[:port]` | off | ESC/POS over TCP, port 9100 by default |

## Rules that bite

- **A render "succeeds" even when blocks are dropped.** Always read
  `failedBlocks` in the report. An unknown `blockType` or data that fails the
  schema just disappears from the slip.
- **Everything ends up 1-bit.** Colours below luminance 128 print black,
  the rest white. Light grey text or lines vanish. Photos and emoji go through
  the `image` block, which dithers them.
- **Fonts have no emoji** (and often no IPA or rare scripts). Emoji in text
  print as blanks. Strip them, or print them as images (see data-patterns.md).
- **Images are data URIs** (PNG or SVG, ≤ 2 MiB each), never URLs or JPEG.
  Download and convert first.
- **Keep lines short.** About 40 characters fit on one 80 mm line at body
  size. Long unbreakable tokens (URLs, hashes) overflow; shorten them.
- **Make daily content deterministic.** When a slip is "of the day", pick by
  date seed so reprints match (`references/patterns/seeded-pick.mjs`).
- **Paper is the budget.** A slip over ~1.5 m long is a mistake. Prefer
  3–6 blocks.

## Word search

`scripts/word-search.mjs` places words in a grid for the builtin
`wordSearch` block. The same words and `--seed` (default: today) always give
the same grid.

```
node <skill>/scripts/word-search.mjs --words gato,perro,búho,araña \
  --difficulty easy|medium|hard --seed 2026-11-19 --title "SOPA DE LETRAS" --into slip.json
```

- `easy`: 8×8, left to right only. Good for young kids.
- `medium`: 10×10, adds down and diagonals, some words reversed.
- `hard`: 12×12, all eight directions, more reversed.

Pick 6–12 words on the user's theme, 3–12 letters each. Accents are
stripped and Ñ is kept. Words that don't fit are reported on stderr and left
out of the list, so the list always matches the grid. With `--into`, it
replaces the first `wordSearch` slot in place, or appends one at the end,
so rerunning it with new words doesn't add a second puzzle. Without
`--into`, it prints the slot JSON to add yourself.

## Files that import pressedslip

Anything that imports `pressedslip`, `react` or `zod` (custom blocks, theme
modules, `.tsx` patterns, `upside-down-theme.mjs`) must be **copied into a
project that has them installed**, because those imports resolve from the
file's own location, not from the skill's cache. The two scripts in
`scripts/` and the plain `.mjs` data patterns run from anywhere.

## Custom blocks

Write one only when no builtin fits: a special layout, pictures beside
text, drawn shapes. Read [references/custom-blocks.md](references/custom-blocks.md)
first. Put the block in the user's project (patterns import `pressedslip`
and `zod`, which must resolve from there), export `blocks`, and render with
`npx tsx <skill>/scripts/render.mjs slip.json --blocks ./my-blocks.tsx`.

## References

- [references/blocks.md](references/blocks.md): builtin blocks, data shapes, limits
- [references/composition.md](references/composition.md): composition fields, paper, themes, header, languages
- [references/custom-blocks.md](references/custom-blocks.md): `defineBlock`, layout pitfalls, reusing builtins
- [references/data-patterns.md](references/data-patterns.md): ways to build the data, with runnable patterns in `references/patterns/`
- [examples/](examples/): complete slips (`morning-briefing`, `puzzle-time`, `shopping-list`)
- Full docs: https://github.com/diegomarino/pressedslip/tree/main/docs · Playground: https://diegomarino.github.io/pressedslip/
