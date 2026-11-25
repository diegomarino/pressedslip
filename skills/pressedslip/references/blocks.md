# Builtin blocks

Every slot is `{ "blockType": "<type>", "title"?: "TITLE", "data": { … } }`.
`title` prints as a black strip above the block. Data is validated with a
Zod schema; anything invalid lands in `failedBlocks`. Rendered samples of
every block: https://github.com/diegomarino/pressedslip/tree/main/docs/blocks

## textCell: a paragraph

```json
{ "text": "Draw a dragon having breakfast.", "align": "center" }
```
`align`: `left` (default) · `center` · `right` · `justify`. For prompts,
notes, messages, instructions.

## kpi: one big number or short value

```json
{ "label": "MADRID", "value": "16° / 9°", "caption": "Showers · rain 80%" }
```
`value` is required and prints large and bold. `label` is a small uppercase
eyebrow above it; `caption` a small line below. Keep `value` under ~14
characters. For weather, countdowns ("12 days"), scores, totals, streak
counts.

## keyValue: one labelled fact

```json
{ "label": "Dinner", "value": "Vegetable lasagna" }
```
Both required. The label is bold and small, the value body text. Use several
slots, or a `list` with `id`s, for many facts.

## list: grouped lines

```json
{
  "groups": [
    { "title": "Events", "items": [{ "id": "1969", "value": "Apollo 12 lands on the Moon." }] },
    { "title": "Births", "separator": " — ", "items": [{ "value": "No id here" }] }
  ]
}
```
At least one group. `title`: bold group heading. `id`: bold prefix (a time,
a year, a number). `separator`: text between `id` and `value`. Wrapped lines
hang under the value. For agendas, shopping lists, rankings, "on this day",
to-dos.

## qaPair: question and answer

```json
{ "question": "What has keys but can't open locks?", "answer": "A piano." }
```
Jokes, riddles, trivia, flashcards. To print the answer upside down, render
with `--upside-down-answers`. It applies to every qaPair in the slip, and the
answer stays right-aligned. To flip only some answers, use the custom
`patterns/riddle-block.tsx`.

## quotation: a quote with byline

```json
{ "text": "The secret of getting ahead is getting started.", "attribution": "Mark Twain" }
```
Italic text; `attribution` prints right-aligned after an em dash.

## checklist: items to tick

```json
{ "items": ["Keys", "Wallet", "Phone"] }
```
At least one string. Each prints with an empty checkbox (drawn box, or `[ ]` in
the `mono` theme); long items wrap. No checked state.

## wordSearch: letter grid with word list

```json
{ "grid": [["C","A","T","…"], …], "words": ["CAT", "DOG"] }
```
`grid`: 6–12 rows × 6–12 columns, rectangular, one character per cell.
`words`: at least one. **Generate it with `scripts/word-search.mjs`**; a
hand-made grid usually hides words that aren't there.

## image: pictures

```json
{
  "layout": "column",
  "images": [{ "src": "data:image/png;base64,…", "alt": "Map", "width": 300 }],
  "maxHeight": 400,
  "fit": "reduce",
  "dither": "floyd-steinberg"
}
```
`layout` must be `"column"` (images stack vertically). 1–12 images. `src` is
a `data:image/png;base64,`, `data:image/svg+xml;base64,` or
`data:image/svg+xml;utf8,` URI, up to 2 MiB; no URLs, JPEG or GIF (convert
first, e.g. with `sharp` or `@resvg/resvg-js`). `fit`: `reduce` (default:
shrink to the paper), `extend` (also enlarge), `none`. `dither`:
`floyd-steinberg` (default; right for photos and emoji) or `none` (right for
line art and QR codes). In Node, `imageFromBuffer(bytes, "image/png")` and
`imageFromUrl(url)` from `pressedslip` build the data URI for you.
