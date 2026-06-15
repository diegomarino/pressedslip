# Custom Block Walkthrough

This guide walks you through writing a custom block from scratch using `defineBlock`. We'll build a weather block that displays a temperature, condition, and icon.

By the end, you'll understand the three core pieces: **schema** (validates your data), **generator** (optional; fetches/transforms data), and **renderer** (React component that draws it).

## The Three-Piece Pattern

Every block has three parts:

1. **Schema** — a Zod validator that ensures your data shape is correct
2. **Generator** — an async function that fetches or transforms data (optional)
3. **Renderer** — a React component that turns data into JSX

See [the `defineBlock` architecture page](../architecture/define-block.md) for
the Mermaid diagram of the block-definition shape and registry flow.

## Step 1: Define Your Data Shape

Start with a Zod schema. This is how the orchestrator knows what data is valid.

```ts
import { z } from "zod";

const weatherBlockSchema = z.object({
  temperature: z.number(),
  condition: z.enum(["sunny", "cloudy", "rainy", "snowy"]),
  icon: z.string(), // URL to an icon image
});

export type WeatherBlockData = z.infer<typeof weatherBlockSchema>;
```

The `z.enum()` locks `condition` to exactly four choices. The renderer will use this to pick the right visual. `z.infer<>` extracts the TypeScript type from your Zod schema, so you have a single source of truth.

## Step 2: Write the Renderer

The renderer is a React component. The orchestrator always calls it with `{ data, ctx }`, where `data` is your validated shape and `ctx` is the render context (composition metadata + logger). You can safely destructure only `{ data }` when you don't need `ctx` — both patterns are valid and shown later. See ["Advanced: Render Context"](#advanced-render-context) for the full signature and the `RenderContext` import path.

```ts
import type { ReactElement } from "react";
import { defineBlock } from "pressedslip";

const renderWeather = ({ data }: { data: WeatherBlockData }): ReactElement => {
  const conditionEmoji: Record<WeatherBlockData["condition"], string> = {
    sunny: "☀️",
    cloudy: "☁️",
    rainy: "🌧️",
    snowy: "❄️",
  };

  return (
    <div
      style={{
        width: "100%",
        padding: 8,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <img
        src={data.icon}
        alt={data.condition}
        style={{
          width: 32,
          height: 32,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {conditionEmoji[data.condition]}
          {data.condition.charAt(0).toUpperCase() + data.condition.slice(1)}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {data.temperature}°C
        </div>
      </div>
    </div>
  );
};
```

Notice:

- **Styles are inline objects, not CSS.** Satori (the rendering engine under the hood) does not support external stylesheets, `<style>` tags, CSS Modules, or CSS-in-JS solutions that inject rules at runtime. The following CSS features are **not** supported and will be silently ignored or produce unexpected output:
  - CSS custom properties (`var(--x)`)
  - `@media` queries and `@keyframes` animations
  - Pseudo-classes (`:hover`, `:focus`) and pseudo-elements (`::before`, `::after`)
  - Multi-column layout (`column-count`, `column-width`)
  - CSS Grid (partial support only — use flexbox instead)
  - `overflow: auto/scroll` (all overflow is hidden)
  - `transform` with `skew` or `matrix` (translate/scale/rotate are supported)

  Supported layout properties are `display: flex`, `flexDirection`, `alignItems`, `justifyContent`, `gap`, padding, margin, border, and most typography properties. See [the satori README](https://github.com/vercel/satori) for the full supported-CSS subset.
- We map `data.condition` to an emoji for visual interest.
- All dimensions are in pixels; satori handles the conversion to the printed output.

### Layout gotcha: flex-row with unbounded text children

If your block uses `display: flex` with `flexDirection: row` and one of the children is a text node with potentially long content (a "value" alongside a fixed "label"), you can hit a silent canvas-edge clip:

<!-- check-doc-snippets: skip -->
```tsx
// ⚠️ Vulnerable to long values
<div style={{ display: "flex", gap: 6 }}>
  <div style={{ fontWeight: 700 }}>Lunch:</div>
  <div>{data.lunch}</div>
</div>
```

What happens under the hood: Yoga (the layout engine Satori uses) measures the value `<div>` at its intrinsic content width because its default `minWidth` is `auto`. When that intrinsic exceeds the available space, Yoga cannot shrink it — Satori lays out glyphs past the canvas, and resvg silently crops at the right edge. Last word of every wrapped line ends up truncated mid-character (`calabacín` → `calabac`).

The library detects this at render time and writes a structured warning to your `logger` plus a `canvasOverflow` field on the `Rendering` return value. See ["Logging and diagnostics"](./using-in-production.md#logging-and-diagnostics) for the warning payload and policy options.

The canonical fix is to either **stack vertically** (preferred — matches every built-in block) or use a four-property idiom on the value.

Preferred — column-stack lets Satori use the full row width to wrap:

<!-- check-doc-snippets: skip -->
```tsx
<div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
  <div style={{ fontWeight: 700 }}>Lunch:</div>
  <div>{data.lunch}</div>
</div>
```

Or, when you really need label and value side-by-side:

<!-- check-doc-snippets: skip -->
```tsx
<div style={{ width: "100%", display: "flex", gap: 6, alignItems: "flex-start" }}>
  <div style={{ fontWeight: 700, flexShrink: 0 }}>Lunch:</div>
  <div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, width: "100%" }}>{data.lunch}</div>
</div>
```

Each property in the side-by-side idiom is load-bearing:

- `width: "100%"` on the row — fixes the row at the shell content width (528 px on the default 80 mm thermal canvas), preventing it from growing to max-content.
- `flexShrink: 0` on the label — keeps fixed-width siblings from being squeezed when the value wraps.
- `flexGrow: 1` + `flexBasis: 0` on the value — instruct Yoga to measure from zero and grow into the remaining space, not from intrinsic content width.
- `minWidth: 0` on the value — overrides Yoga's default `minWidth: auto`. Without this line the previous three do nothing.
- `alignItems: "flex-start"` on the row — anchors the label to the top of the wrapped block instead of vertically centering it.

**Caveat about unbreakable text.** If your `data.lunch` contains a single token with no whitespace (a long URL, a German compound, a hash), no layout strategy can wrap it — Yoga has nowhere to break. The detector will still fire in that case; the fix is upstream (truncate, validate input, or split the token). Satori does not yet support `word-break: break-word`.

## Step 3: Define the Block

Now assemble schema + renderer into a block definition using `defineBlock`.

```ts
import { defineBlock } from "pressedslip";

export const weatherBlock = defineBlock({
  type: "weather",
  schema: weatherBlockSchema,
  render: renderWeather,
  shell: {
    showTitle: true,
    separator: "thin",
    padding: "normal",
  },
  hints: [
    "Required: `data.temperature` (number), `data.condition` (sunny|cloudy|rainy|snowy), `data.icon` (URL)",
    "Tip: `data.temperature` is displayed in Celsius",
    "Docs: docs/blocks/weather.md",
  ],
});
```

The `shell` object controls visual chrome:

- `showTitle: true` — the optional `title` passed at compose time will render above the block.
- `separator: "thin"` — a thin line below this block (or "thick", or "none").
- `padding: "normal"` — standard spacing around the block (or "compact", or "loose").

The `hints` array provides hints to the JSONC playground—they render as `//` comments in the editor to help users understand what fields are required and what values are valid.

## Step 4: Register and Use

Create a registry with your new block and pass it to `render()`. Two ingredients are new here:

- **`createRegistry([...blocks])`** — collects your block definitions so `render()` can dispatch each `slot.blockType` to the matching renderer.
- **`loadThemeFonts(themes.default)`** — fetches font bytes from CDN and returns a `PreparedTheme`. Pass the result to `render()` so the pipeline has fonts. See [`docs/guide/themes.md`](./themes.md) for the full font setup walkthrough, including disk caching for batch renders.

```ts
import {
  createRegistry,
  loadThemeFonts,
  PAPER,
  render,
  themes,
  type CompositionInput,
} from "pressedslip";

const registry = createRegistry([weatherBlock]);

// Load fonts once; pass the PreparedTheme to render() for fast repeated renders.
// See docs/guide/themes.md for the full theme setup walkthrough.
const theme = await loadThemeFonts(themes.default);

// Composition shape — required fields: id, version, date, status, slots,
//   failedBlocks, providerOutcomes, timing. The cast satisfies TypeScript when
//   building a literal; compose() fills these automatically (see Providers guide).
//   Optional: subject ({ id, name }), generatedAt, meta.
const composition: CompositionInput = {
  id: "weather-demo",
  version: 1,
  date: "2026-05-24",
  status: "ready",
  slots: [
    {
      index: 0,
      blockType: "weather",
      data: {
        temperature: 22,
        condition: "sunny" as const, // `as const` narrows the literal so TypeScript doesn't widen it to `string`
        icon: "https://example.com/sunny.png",
      },
    },
  ],
};

const result = await render(composition, {
  registry,
  width: PAPER.thermal80,
  theme,
});

// result.bytes is a Uint8Array containing the 1-bit PNG
console.log(`Rendered ${result.width}x${result.height}`);
```

## Full Example: A Complete Block

Here's a complete, runnable example combining all three steps:

```ts
import { z } from "zod";
import type { ReactElement } from "react";
import {
  defineBlock,
  createRegistry,
  loadThemeFonts,
  PAPER,
  render,
  themes,
  type CompositionInput,
} from "pressedslip";

// Step 1: Schema
const temperatureBlockSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.enum(["C", "F"]).default("C"),
});

type TemperatureBlockData = z.infer<typeof temperatureBlockSchema>;

// Step 2: Renderer
const renderTemperature = ({
  data,
}: {
  data: TemperatureBlockData;
}): ReactElement => (
  <div
    style={{
      width: "100%",
      padding: 8,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
    }}
  >
    <div style={{ fontSize: 14, fontWeight: 700 }}>{data.label}</div>
    <div style={{ fontSize: 32, fontWeight: 700 }}>
      {data.value}°{data.unit}
    </div>
  </div>
);

// Step 3: Define
export const temperatureBlock = defineBlock({
  type: "temperature",
  schema: temperatureBlockSchema,
  render: renderTemperature,
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.label` (string), `data.value` (number)",
    "Optional: `data.unit` (C|F, default C)",
  ],
});

// Step 4: Use it
const main = async () => {
  const registry = createRegistry([temperatureBlock]);

  const composition: CompositionInput = {
    id: "temperature-demo",
    version: 1,
    date: "2026-05-24",
    status: "ready",
    slots: [
      {
        index: 0,
        blockType: "temperature",
        data: { label: "Room Temperature", value: 22, unit: "C" as const }, // `as const` keeps the literal "C" type; without it TypeScript widens to `string`
      },
    ],
  };

  const theme = await loadThemeFonts(themes.default);

  const result = await render(composition, {
    registry,
    width: PAPER.thermal80,
    theme,
  });

  console.log(`Rendered: ${result.width}x${result.height}`);
  // Your PNG is in result.bytes
};

main().catch(console.error);
```

## Validators with Defaults

Zod's `.default()` works directly with `defineBlock`. Because `BlockDefinitionSpec.schema` is typed as `ZodType<TData>` (the *output* type only), the schema coerces input at validation time and your renderer always receives the fully-resolved output — including filled-in defaults:

<!-- check-doc-snippets: skip -->
```ts
const blockSchema = z.object({
  name: z.string(),
  size: z.enum(["small", "large"]).default("small"),
});

// TData is inferred as { name: string; size: "small" | "large" }
// Even when the caller omits `size`, the renderer receives "small".
export const myBlock = defineBlock({
  type: "my-block",
  schema: blockSchema,
  render: ({ data }) => {
    // data.size is always "small" | "large" — never undefined
    return <div>{data.size}</div>;
  },
});
```

The `as const` cast in slot data (e.g., `"C" as const`) is only needed at the **call site** when TypeScript would otherwise widen the literal type (e.g., infer `string` instead of `"C"`). It is **not** required inside `defineBlock` itself.

> **Note:** Earlier Zod versions (pre-3.x) had a quirk where `ZodType<Output>` did not accept schemas with transformations without explicit type parameters. If you are on an older Zod version and see type errors, cast the schema: `schema as ZodType<{ name: string; size: "small" | "large" }>`. All modern Zod 3.x+ releases resolve this correctly.

## Advanced: Render Context

The `render` function signature defined in `BlockDefinitionSpec` is always:

<!-- check-doc-snippets: skip -->
```ts
render: (props: { data: TData; ctx: RenderContext }) => ReactElement | null
```

`ctx` is **always present** — the orchestrator injects it on every call. You can safely destructure only `{ data }` when you don't need context (as the earlier examples do), or destructure both when you need composition metadata or the logger:

```ts
import type { RenderContext } from "pressedslip"; // exported from the main entry-point

const render = ({
  data,
  ctx,
}: {
  data: MyData;
  ctx: RenderContext;
}): ReactElement => {
  // ctx.composition — the full Composition envelope (slots, subject, date, status)
  // ctx.subject     — shortcut for ctx.composition.subject (may be undefined)
  // ctx.logger      — structured logger; no-op by default, active if you pass
  //                   a logger in RenderOptions
  // ctx.block       — the raw Block input (type, id, data) for this slot
  ctx.logger.debug("Rendering custom block", { data });

  return <div>{/* ... */}</div>;
};
```

This is useful when you need to style differently based on the subject or log timing details.

> **In render-only flow** (`render()` called directly, not via `compose()`): `ctx.cache` and `ctx.config` are always `undefined`; `ctx.composition` carries the composition you passed in.

## Summary

To write a custom block:

1. **Define a Zod schema** for your data shape
2. **Write a React renderer** — signature is always `({ data, ctx }) => ReactElement | null`; destructure only `{ data }` when you don't need context
3. **Call `defineBlock`** with `{ type, schema, render, shell, hints }`
4. **Create a registry** with `createRegistry([yourBlock, ...])`
5. **Call `render(composition, { registry, ... })`** to generate a PNG

The render pipeline validates every slot's data against your schema at **render-time** (inside `render()`, not at compose-time). Specifically, it calls `schema.safeParse(slot.data)` before invoking your `render` function. On failure: no error is thrown; instead the slot is dropped and a record is appended to `result.failedBlocks`. Each `FailedBlock` entry carries `{ index, blockType, reason: { name, message } }`. This safety layer means your renderer can assume `data` is already well-formed (it is the parsed, default-filled Zod output).

For more examples, see `src/blocks/` in the package source — `textCellBlock`, `keyValueBlock`, and `listBlock` are all simple reference implementations.
