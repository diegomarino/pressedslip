# Custom blocks

Write a block only when no builtin fits. A block is a Zod schema, a React
render function and some shell options:

```tsx
/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { applyTextStyle, type BlockDefinition, defineBlock } from "pressedslip";
import { type ZodType, z } from "zod";

type CountdownData = { event: string; days: number };

const schema: ZodType<CountdownData> = z.object({
  event: z.string().min(1),
  days: z.number().int().nonnegative(),
});

export const countdownBlock: BlockDefinition<CountdownData> = defineBlock({
  type: "countdown", // the slot's blockType
  schema,
  render: ({ data, ctx }) => (
    <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles)}>{data.days}</div>
      <div style={applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles)}>days until {data.event}</div>
    </div>
  ),
  shell: { showTitle: true, separator: "thin", padding: "normal" },
});

export const blocks = [countdownBlock];
```

Render with `npx tsx <skill>/scripts/render.mjs slip.json --blocks ./countdown.tsx`.
The file must live in the user's project so `pressedslip`, `react` and `zod`
resolve. The JSX pragmas let `tsx` compile it without a tsconfig.

Patterns to copy from: `patterns/riddle-block.tsx` (text styles, rotated
answer), `patterns/streak-block.tsx` (shapes drawn with boxes, weekday
letters from `meta.language`), `patterns/emoji-checklist.tsx` (pictures via
the builtin image block). More in the playground:
https://github.com/diegomarino/pressedslip/tree/main/apps/playground/src/showcase-blocks

## What `ctx` gives you

| Field | Use |
|---|---|
| `ctx.theme.textStyles.<role>` | Pass to `applyTextStyle(style, ctx.fontRoles)` so the block follows the theme |
| `ctx.theme.listItemBullet` | The theme's bullet character |
| `ctx.contentWidth` | Usable width in px inside the shell padding; size large type and images from it |
| `ctx.dpi` | Dots per inch; `px = mm × dpi / 25.4` |
| `ctx.composition.date` / `.meta` | Date and free-form settings (language…) |

`shell.showTitle` prints the slot's `title` strip; `separator` is `thin`,
`thick` or `none`; `padding` is `compact`, `normal` or `loose`.

## Satori layout rules

Rendering uses Satori (flexbox via Yoga), not a browser:

- Every `div` with more than one child needs `display: "flex"`. Put text
  in its own `div`.
- No CSS grid, no `float`, no `position: fixed`. Absolute positioning works
  inside a relative parent.
- **Flex rows with long text overflow silently.** Stack label and value in
  a column. If they must sit side by side, give the label `flexShrink: 0`
  and the value `flexGrow: 1, flexBasis: 0, minWidth: 0` (all three). The
  report's `canvasOverflow` catches this.
- Inline `<svg>` works. Fill with pure black.
- Draw marks, tick boxes, dots and frames as `div`s with `border` or
  `backgroundColor`. Glyphs like ●○☐ depend on font coverage.
- The `render` function is synchronous. Fetch and rasterize everything
  before rendering and pass the results in through `data`.

## Printing at 1 bit

- Anything you want printed needs luminance below 128: use `#000`.
- Pictures go through the image block's dithering. Call it from your block
  with `imageBlock.render({ data, ctx })`, passing fully resolved data
  (`layout`, `fit`, `dither`, `maxHeight`), and wrap it in a fixed-size box.
- Emoji: rasterize the SVG to a PNG on a white background first; flat light
  colours vanish at a plain threshold but survive dithering.

## Reusing a builtin

A builtin definition is a plain object, so you can wrap it:

```ts
import { type BlockDefinition, type WordSearchData, wordSearchBlock } from "pressedslip";

/** Same type and schema; grid lines forced to black for a theme with a light separatorColor. */
export const inkWordSearchBlock: BlockDefinition<WordSearchData> = {
  ...wordSearchBlock,
  render: ({ data, ctx }) =>
    wordSearchBlock.render({ data, ctx: { ...ctx, theme: { ...ctx.theme, wordSearchBorderColor: "#000" } } }),
};
export const blocks = [inkWordSearchBlock];
```

`render.mjs` lets a `--blocks` module replace a builtin with the same `type`.
