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
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";

const registry = createRegistry(builtinBlocks);
const { bytes } = await render(composition, { registry, wasm: wasmUrl });
```

The `?url` query imports the wasm file as a public asset and returns its URL at runtime.

#### Create React App

Create React App does not support `?url` imports natively. Instead:

1. Copy `node_modules/@resvg/resvg-wasm/index_bg.wasm` into `public/wasm/index_bg.wasm`.
2. Pass the URL directly:

```ts
const registry = createRegistry(builtinBlocks);
const { bytes } = await render(composition, { registry, wasm: "/wasm/index_bg.wasm" });
```

## Minimal example

```ts
import { render, builtinBlocks, createRegistry, themes } from "pressedslip/browser";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";

const composition = {
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
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

const registry = createRegistry(builtinBlocks);
const { bytes, width, height } = await render(composition, {
  registry,
  theme: themes.default,
  wasm: wasmUrl,
});

// bytes is Uint8Array — 1-bit PNG
// Display it: new Blob([bytes], { type: "image/png" })
const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
document.getElementById("preview").src = url;
```

## Font loading

### Use builtin themes (simplest)

```ts
import { builtinBlocks, createRegistry, render, themes } from "pressedslip/browser";

const { bytes } = await render(composition, {
  registry: createRegistry(builtinBlocks),
  theme: themes.default,
  wasm: wasmUrl,
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
    enabled: true,
    showDate: true,
  },
};

const preparedTheme = await loadThemeFonts(customTheme);
const { bytes } = await render(composition, {
  registry,
  theme: preparedTheme,
  wasm: wasmUrl,
});
```

Theme resolution is identical to the Node entry point. See [Themes](./themes.md) for the full API reference.

## Handling render failures

Render returns a `Rendering` object with a `failedBlocks` array. Failed blocks are included in output as a fallback, but their data or formatting may be degraded.

```ts
const { bytes, failedBlocks } = await render(composition, {
  registry,
  theme: themes.default,
  wasm: wasmUrl,
});

if (failedBlocks.length > 0) {
  console.warn("Render failed for blocks:", failedBlocks.map((b) => b.blockType));
}
```

## Browser constraints

- **Fonts** must be fetched from `http(s)://` URLs or provided as byte buffers. File paths and `file://` URLs are not supported.
- **No file I/O** — all data flows through composition objects and runtime APIs.
- **WebAssembly** — a `BrowserRenderOptions.wasm` binary (URL string or fetch response) must be supplied. There is no fallback.
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
const { bytes } = await render(composition, { registry, theme: themes.default, wasm: wasmUrl });

// Option 1: Object URL + <img>
const blob = new Blob([bytes], { type: "image/png" });
const url = URL.createObjectURL(blob);
document.getElementById("preview").src = url;

// Option 2: Data URL
const dataUrl = `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
document.getElementById("preview").src = dataUrl;

// Option 3: Canvas (requires additional canvas-to-png library if you need to further process)
const blob = new Blob([bytes], { type: "image/png" });
const url = URL.createObjectURL(blob);
const img = new Image();
img.onload = () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
};
img.src = url;
```

## Debugging

Pass a custom `logger` object if you want warnings and render errors routed to
your application logging layer. The logger interface is documented in the root
API reference.

See [Font Loading](../architecture/font-loading.md) for the Mermaid sequence
diagram of how fonts flow through the system.
