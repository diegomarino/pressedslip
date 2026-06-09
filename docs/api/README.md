# API Reference

This directory is the public API entrypoint for `pressedslip`.

## Public entrypoints

| Import path | Runtime | Use it for |
|---|---|---|
| `pressedslip` | Node | Render PNGs with the Node resvg-js renderer, define blocks, build registries, compose provider-backed compositions, load themes/fonts, and use the browser-safe provider primitives. |
| `pressedslip/browser` | Browser | Render PNGs with resvg-wasm and use the browser-safe block, registry, theme, provider, and composition APIs without importing Node native modules. |
| `pressedslip/providers` | Node | Node-oriented provider helpers: file cache, node font cache, OpenMeteo provider, and provider registry helpers. |
| `pressedslip/transports` | Node | Delivery adapters: ESC/POS raster output, file transport, HTTP transport, and shared transport types. |
| `pressedslip/testing` | Node or test runners | Builtin block fixtures and structural assertion helpers for downstream regression tests. |

## Common imports

```ts
import {
  PAPER,
  builtinBlocks,
  createRegistry,
  loadThemeFonts,
  render,
  themes,
} from "pressedslip";
```

```ts
import { builtinBlocks, createRegistry, render, themes } from "pressedslip/browser";
```

```ts
import { createFileCache, createOpenMeteoProvider } from "pressedslip/providers";
import { createEscPosTransport } from "pressedslip/transports";
import { assertNoFailedBlocks } from "pressedslip/testing";
```

## Generated TypeDoc

The complete symbol-by-symbol reference is generated from TSDoc-annotated
source by [TypeDoc](https://typedoc.org/). Regenerate it locally:

```bash
pnpm docs:api
```

The generated HTML lands in `docs/api/reference/` as a browsable site. Open
`docs/api/reference/index.html` after running the command. Generated HTML is
ignored by git; this `README.md` is the committed API overview.

## CI coverage

API documentation is checked mechanically:

- `pnpm docs:api` fails on TypeDoc warnings, undocumented public symbols, and invalid links.
- `pnpm check-docs` enforces public TSDoc blocks and Markdown link health.
- `pnpm check-public-docs` rejects stale public snippets, old package names, old render option names, and removed D2/SVG diagram references.
