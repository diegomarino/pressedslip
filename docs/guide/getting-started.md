# Getting Started

Render your first printable composition in a few minutes.

## Install

```bash
pnpm add pressedslip
# or: npm install pressedslip
# or: yarn add pressedslip
```

## Your First Render

Create `render-briefing.ts`:

```ts
import { writeFile } from "node:fs/promises";
import {
  PAPER,
  builtinBlocks,
  createRegistry,
  loadThemeFonts,
  render,
  themes,
  type Composition,
} from "pressedslip";

const registry = createRegistry(builtinBlocks);
const theme = await loadThemeFonts(themes.default);

const composition = {
  id: "morning-brief",
  version: 1,
  date: new Date().toISOString().slice(0, 10),
  status: "ready",
  slots: [
    {
      index: 0,
      blockType: "kpi",
      title: "WEATHER",
      data: { value: "18°C", label: "OLEIROS", caption: "Partly cloudy · low 13°C" },
    },
    {
      index: 1,
      blockType: "list",
      title: "CALENDAR",
      data: {
        groups: [
          {
            title: "MORNING",
            items: [
              { id: "09:00", value: "Weekly sync · Design × Eng" },
              { id: "10:30", value: "1-on-1 with María" },
            ],
          },
          {
            title: "AFTERNOON",
            items: [
              { id: "14:00", value: "Deep work block" },
              { id: "16:45", value: "Product demo · Acme Corp" },
            ],
          },
        ],
      },
    },
    {
      index: 2,
      blockType: "quotation",
      title: "QUOTE",
      data: {
        text: "Make it work, make it right, make it fast.",
        attribution: "Kent Beck",
      },
    },
    {
      index: 3,
      blockType: "keyValue",
      title: "DAYLIGHT",
      data: { label: "Sunrise · Sunset", value: "06:22 · 21:04" },
    },
  ],
} as Composition;

const { bytes } = await render(composition, {
  registry,
  theme,
  width: PAPER.thermal80,
});

await writeFile("morning-brief.png", bytes);
console.log("Rendered morning-brief.png");
```

Run it:

```bash
npx tsx render-briefing.ts
```

Open `morning-brief.png`. You should see a receipt-style document with four blocks.

![Morning briefing rendered at 80mm thermal width](../assets/visual-refs/composition-example.png)

## What You Did

1. **Created a registry**: `createRegistry(builtinBlocks)` registers the seven builtins: `textCell`, `keyValue`, `kpi`, `list`, `qaPair`, `quotation`, and `wordSearch`.
2. **Prepared a theme**: `loadThemeFonts(themes.default)` fetches TTF/OTF font bytes with global `fetch`.
3. **Defined a composition**: `slots[]` is ordered data. Each slot names a `blockType`, optional `title`, and block-specific `data`.
4. **Rendered to PNG**: `render()` returns `{ bytes, format, width, height, failedBlocks }`.
5. **Wrote the file**: `bytes` is a `Uint8Array` containing a 1-bit PNG.

## Next Steps

- For local font files in Node, read bytes with `node:fs/promises` and pass them to `loadFontFromBuffer`.
- Use [Themes](themes.md) to customize typography and shell styles.
- Use [Providers](providers.md) when blocks need API/database/sensor data before rendering.
- Use [Browser Rendering](browser-rendering.md) for `pressedslip/browser`.
- Use [Transports](transports.md) to send PNG bytes to ESC/POS, file, or HTTP destinations.
- Use [Testing](testing.md) for structural assertions instead of PNG byte snapshots.

## Blocks

Every slot references a block type. The package includes:

- **`textCell`**: single text body with optional alignment.
- **`keyValue`**: key-value rows for compact facts.
- **`kpi`**: large value with optional label and caption.
- **`list`**: flat or grouped lists.
- **`qaPair`**: question and answer content.
- **`quotation`**: quotation body with optional attribution.
- **`wordSearch`**: fixed letter grid with hidden words.

Start with the [block guides](../blocks/text-cell.md) for exact data shapes and design notes.

## Determinism Caveat

PNG output is not byte-identical across operating systems, Node versions, or Bun versions. Font rasterizers can differ. In tests, assert structure and failures rather than raw PNG buffers:

```ts
import { assertNoFailedBlocks } from "pressedslip/testing";

const rendering = await render(composition, { registry, theme: themes.default });
assertNoFailedBlocks(rendering, { expect });
```

## API Reference

Run `pnpm docs:api` to generate TypeDoc HTML into `docs/api/reference/`. The generated HTML is local build output and is not committed.
