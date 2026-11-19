# Composition, paper and themes

## Composition fields

```jsonc
{
  "date": "2026-11-19",                     // YYYY-MM-DD, printed in the header. Defaults to today.
  "subject": { "id": "lisa", "name": "Lisa" }, // optional: name printed in the header
  "meta": { "language": "es" },             // optional: free-form, passed to every block as ctx.composition.meta
  "slots": [ /* blocks, printed top to bottom */ ]
}
```

`render.mjs` fills in `id`, `version`, `status` and each slot's `index`.
The header (subject name, date, rule) is always printed, and the date
appears as-is in ISO form (`2026-11-19`); there is no option to format it.
For a friendly or translated date, add it as the first block, e.g. a
`textCell` with "Jueves, 19 de noviembre".

`meta` is how one slip carries settings that custom blocks read (language,
level, household name). Builtin blocks ignore it: write builtin text already
in the reader's language.

## Paper

| Preset | Width | Use |
|---|---|---|
| `thermal58` | 384 px | 58 mm receipt printers |
| `thermal80` | 576 px | 80 mm receipt printers (default) |
| `thermal110` | 832 px | 110 mm label printers |

Height grows with content. At 203 dpi, 8 px ≈ 1 mm, so a 2000 px slip is
about 25 cm of paper.

## Themes

- `default`: Inter, comfortable spacing.
- `compact`: Atkinson Hyperlegible, tighter spacing; fits more on narrow paper and is easy for early readers.
- `mono`: JetBrains Mono; a typewriter or terminal look, and every glyph has the same width.

Pass `--theme default|compact|mono`, or a module path whose `theme` export is
a theme object. Override a builtin by spreading it:

```js
import { themes } from "pressedslip";
export const theme = {
  ...themes.default,
  shell: {
    ...themes.default.shell,
    titleAlignment: "left",
    textStyles: { ...themes.default.shell.textStyles, answer: { rotate: 180 } },
  },
};
```

Text style roles and the builtin fields they style:

| Role | Used by |
|---|---|
| `body` | textCell text, keyValue value, list item value |
| `emphasis` | list group title and item id, quotation text |
| `display` | kpi value |
| `label` | kpi label and caption, keyValue label, quotation attribution |
| `question` / `answer` | qaPair |

A text style accepts `fontSize`, `fontWeight`, `fontStyle`, `lineHeight`,
`textAlign`, `textTransform`, `color`, `fontRole` and `rotate` (0 or 180).
More: https://github.com/diegomarino/pressedslip/blob/main/docs/guide/themes.md

## Printing

`--print host[:port]` sends the PNG as ESC/POS raster over raw TCP (port 9100
on most network receipt printers) with a feed and a cut. The printer gives
no delivery confirmation: a closed connection doesn't mean it printed. The
paper width preset must match the printer, or the slip is cropped or narrow.
Other transports (HTTP, file) are in `pressedslip/transports`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Unknown block type: X` in failedBlocks | Typo in `blockType`, or the custom block wasn't passed with `--blocks` |
| `Schema validation failed` | Data shape is wrong; the message names the path |
| `canvasOverflow` not null | A long unbreakable token, or a flex row in a custom block (see custom-blocks.md) |
| `Font fetch failed` | No network to fonts.gstatic.com. Fonts are cached in `~/.cache/pressedslip-fonts` after the first success |
| Blank squares or missing characters | The font lacks the glyph (emoji, IPA, CJK). Strip it or render it as an image |
| Something light disappeared | Colour lighter than the 1-bit threshold; use black |
