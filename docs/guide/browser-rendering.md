# Render in a browser without Node

This guide covers rendering compositions in a browser environment — no Node.js backend, no file system access. You'll use `pressedslip/browser` instead of the root entry point, load fonts from CDN or as byte buffers, and provide a WebAssembly binary for SVG-to-PNG conversion.

## Setup

Assume an existing Vite or Create React App project with `pnpm add pressedslip` already done.

### 1. Import from `pressedslip/browser`

```ts
import { render, builtinBlocks, createRegistry } from "pressedslip/browser";
```

The `/browser` subpath exports all the composition, block, theme, and provider APIs needed for client-side rendering. It does NOT transitively import `@resvg/resvg-js` (the Node native addon), keeping your bundle lean for browsers.

### 2. Provide the WebAssembly binary

Browser rendering requires `@resvg/resvg-wasm`, which ships as a `.wasm` file. You must provide its URL at render time.

#### Vite projects

```ts
import { render } from "pressedslip/browser";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";

const registry = createRegistry(builtinBlocks);
const { bytes } = await render(composition, { registry, wasm: fetch(wasmUrl) });
```

The `?url` query imports the wasm file as a public asset and returns its URL at runtime. Wrap it in `fetch()` to get a `Promise<Response>`, which is what `wasm` accepts.

#### Create React App

Create React App does not support `?url` imports natively. Instead:

1. Copy `node_modules/@resvg/resvg-wasm/index_bg.wasm` into `public/wasm/index_bg.wasm`.
2. Pass the URL via `fetch()`:

```ts
import { render } from "pressedslip/browser";

const registry = createRegistry(builtinBlocks);
const { bytes } = await render(composition, { registry, wasm: fetch("/wasm/index_bg.wasm") });
```

## Minimal example

```ts
import { render, builtinBlocks, createRegistry, themes, type CompositionInput } from "pressedslip/browser";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";

const browserComposition: CompositionInput = {
  id: "browser-demo",
  version: 1,
  date: "2026-06-08",
  status: "ready",
  slots: [
    {
      index: 0,
      blockType: "kpi",
      title: "Revenue",
      data: { label: "Today", value: "$42K", caption: "+12%" },
    },
  ],
};

const registry = createRegistry(builtinBlocks);
const { bytes, width, height } = await render(browserComposition, {
  registry,
  theme: themes.default,
  wasm: fetch(wasmUrl),
});

// bytes is Uint8Array — 1-bit PNG
// Display it: new Blob([bytes.buffer], { type: "image/png" })
const pngBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const url = URL.createObjectURL(new Blob([pngBuffer], { type: "image/png" }));
(document.getElementById("preview") as HTMLImageElement).src = url;
```

## Font loading

### Use builtin themes (simplest)

```ts
import { builtinBlocks, createRegistry, render, themes } from "pressedslip/browser";

const { bytes } = await render(composition, {
  registry: createRegistry(builtinBlocks),
  theme: themes.default,
  wasm: fetch(wasmUrl),
});
```

Builtin themes (`default`, `mono`, `compact`) ship with CDN font URLs (Google Fonts, jsDelivr). Fonts are fetched and cached in memory per page load. Browser HTTP caching ensures the CDN is not hammered on repeat renders.

### Load custom theme fonts

The `/browser` subpath supports theme-based loading via `loadThemeFonts`.
Lower-level `loadFontFromUrl` and `loadFontFromBuffer` are exported from the
root package, but root imports also include the Node render path. Browser apps
should prefer `themes.*` or `loadThemeFonts()` from `pressedslip/browser`.

```ts
import { loadThemeFonts, render, type ThemeTemplate } from "pressedslip/browser";

const customTheme: ThemeTemplate = {
  id: "my-theme",
  label: "My Theme",
  roleUrls: {
    body: [
      {
        family: "CustomSans",
        url: "https://cdn.example.com/custom-400.ttf",
        weight: 400,
        style: "normal",
      },
    ],
    display: [
      {
        family: "CustomSans",
        url: "https://cdn.example.com/custom-700.ttf",
        weight: 700,
        style: "normal",
      },
    ],
  },
  shell: {
    titleStyle: "block",
    titleBg: "#333",
    titleFg: "#fff",
  },
  header: {
    nameFontSize: 32,
    nameFontWeight: 700,
    dateFontSize: 14,
  },
};

const preparedTheme = await loadThemeFonts(customTheme);
const { bytes } = await render(composition, {
  registry,
  theme: preparedTheme,
  wasm: fetch(wasmUrl),
});
```

Theme resolution is identical to the Node entry point. See [Themes](./themes.md) for the full API reference.

## Handling render failures

Render returns a `Rendering` object with a `failedBlocks` array. Failed blocks are included in output as a fallback, but their data or formatting may be degraded.

```ts
import { render, themes } from "pressedslip/browser";

const { bytes, failedBlocks } = await render(composition, {
  registry,
  theme: themes.default,
  wasm: fetch(wasmUrl),
});

if (failedBlocks.length > 0) {
  console.warn("Render failed for blocks:", failedBlocks.map((b) => b.blockType));
}
```

## Browser constraints

- **Fonts** must be fetched from `http(s)://` URLs or provided as byte buffers. File paths and `file://` URLs are not supported.
- **No file I/O** — all data flows through composition objects and runtime APIs.
- **WebAssembly** — a `BrowserRenderOptions.wasm` binary (buffer, `Response`, or `Promise<Response>` — e.g., `fetch(wasmUrl)`) must be supplied. There is no fallback.
- **Async render** — both browser and Node render entry points are async.

## Font format

Satori (the underlying renderer) parses **TTF and OTF only**. WOFF2 is not supported. If your font source defaults to WOFF2, use the static TTF endpoints:

- Google Fonts: `https://fonts.gstatic.com/s/.../v.../<file>.ttf`
- jsDelivr Fontsource: `https://cdn.jsdelivr.net/npm/@fontsource/<name>@5/files/<name>-latin-400-normal.ttf`

## Differences from Node rendering

Node-only factories live on explicit subpaths (`pressedslip/providers` and
`pressedslip/transports`). The `/browser` subpath omits those Node-only exports:

| Feature | Root (`pressedslip`) | `/browser` |
|---------|----------------------|-----------|
| `render()` | Async (Node resvg-js) | Async (resvg-wasm) |
| Default width | `PAPER.thermal80` (576px) | `PAPER.thermal80` (576px) |
| Font sources | URLs via theme loading or explicit bytes | URLs via theme loading |
| Cache | `memoryFontCache`; `nodeFontCache` from `/providers` | `memoryFontCache` only |
| Built-in blocks | Via `builtinBlocks` | Via `builtinBlocks` (browser-safe re-export) |

Both paths are functionally equivalent by design (see ADR-0018). Do not assume
PNG bytes are identical across operating systems or runtime versions.

## Rendering to canvas or image element

Once you have the PNG bytes:

```ts
import { render, themes } from "pressedslip/browser";

const { bytes } = await render(composition, { registry, theme: themes.default, wasm: fetch(wasmUrl) });
const pngBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

// Option 1: Object URL + <img>
const blob = new Blob([pngBytes], { type: "image/png" });
const url = URL.createObjectURL(blob);
(document.getElementById("preview") as HTMLImageElement).src = url;

// Option 2: Data URL
const dataUrl = `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
(document.getElementById("preview") as HTMLImageElement).src = dataUrl;

// Option 3: Canvas (requires additional canvas-to-png library if you need to further process)
const blob2 = new Blob([pngBytes], { type: "image/png" });
const url2 = URL.createObjectURL(blob2);
const img = new Image();
img.onload = () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx2 = canvas.getContext("2d");
  ctx2?.drawImage(img, 0, 0);
};
img.src = url2;
```

## Debugging

Pass a custom `logger` object if you want warnings and render errors routed to
your application logging layer. The logger interface is documented in the root
API reference.

See [Font Loading](../architecture/font-loading.md) for the Mermaid sequence
diagram of how fonts flow through the system.
