# pressedslip

> Opinionated printable content blocks for apps that need deterministic,
> inspectable PNG output for thermal printers, receipts, briefings, and compact
> status displays.

[![npm version](https://img.shields.io/npm/v/pressedslip.svg)](https://www.npmjs.com/package/pressedslip)
[![CI](https://github.com/diegomarino/pressedslip/actions/workflows/ci.yml/badge.svg)](https://github.com/diegomarino/pressedslip/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Example render](https://raw.githubusercontent.com/diegomarino/pressedslip/main/docs/assets/visual-refs/composition-example.png)

`pressedslip` lets you describe printable content as data, render it through
React/Satori/resvg, inspect the resulting composition, and then save the PNG or
send it to a transport. It is built for product dashboards, personal automation,
briefing printers, embedded displays, and any workflow where receipt-like output
should be generated from typed blocks instead of hand-built layout code.

[Try the playground](https://diegomarino.github.io/pressedslip/) |
[Read the docs](https://github.com/diegomarino/pressedslip/tree/main/docs) |
[API overview](https://github.com/diegomarino/pressedslip/blob/main/docs/api/README.md)

## Install

```bash
pnpm add pressedslip
npm install pressedslip
```

## Quick Example

```ts
import {
  render,
  createRegistry,
  builtinBlocks,
  loadThemeFonts,
  themes,
  PAPER,
} from "pressedslip";
import { writeFile } from "node:fs/promises";

const registry = createRegistry(builtinBlocks);
const theme = await loadThemeFonts(themes.default);

const composition = {
  id: "hello",
  version: 1,
  date: "2026-06-08",
  status: "ready",
  slots: [
    {
      index: 0,
      blockType: "textCell",
      title: "Hello",
      data: { text: "Your first composition." },
    },
    {
      index: 1,
      blockType: "kpi",
      title: "Metrics",
      data: { label: "Uptime", value: "99.9%" },
    },
  ],
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

const { bytes } = await render(composition, {
  registry,
  theme,
  width: PAPER.thermal80,
});

await writeFile("out.png", bytes);
```

## Why pressedslip?

- **Composable content blocks** - seven builtin blocks (text, list, key-value,
  KPI, Q&A, quotation, word-search); write your own via `defineBlock`.
- **Browser and Node renders from the same source** - `pressedslip/browser`
  ships a resvg-wasm path so the playground and Node CI render with identical
  output.
- **Interactive playground** - try real compositions before writing code:
  <https://diegomarino.github.io/pressedslip/>.
- **Pre-built themes** - three printable themes (warm, cool, mono) with
  deterministic font and layout roles.
- **Provider lifecycle** - async data fetchers with parallel fetch, timeout,
  cache, and fail-soft. Plug in OpenMeteo, a static-text source, or your own.
- **Thermal-printer-ready transports** - ESC/POS encoder plus file and HTTP
  transports out of the box (`pressedslip/transports`).

## Public API

`pressedslip` exposes a small set of package entrypoints:

| Import path | Runtime | Use it for |
|---|---|---|
| `pressedslip` | Node | Render PNGs, define blocks, build registries, compose provider-backed content, and load themes/fonts. |
| `pressedslip/browser` | Browser | Render through resvg-wasm and use browser-safe block, registry, theme, provider, and composition APIs. |
| `pressedslip/providers` | Node | File cache, node font cache, OpenMeteo provider, and provider registry helpers. |
| `pressedslip/transports` | Node | ESC/POS raster output, file transport, HTTP transport, and shared transport types. |
| `pressedslip/testing` | Tests | Builtin fixtures and structural assertion helpers for downstream regression tests. |

The human API overview lives in
[`docs/api/README.md`](https://github.com/diegomarino/pressedslip/blob/main/docs/api/README.md).
The complete symbol reference is generated from TSDoc:

```bash
pnpm docs:api
```

Generated TypeDoc HTML lands in `docs/api/reference/`. GitHub Pages is reserved
for the interactive playground, so the API reference is generated in CI and can
be built locally from the published source repo.

## Guides

- [Getting started](https://github.com/diegomarino/pressedslip/blob/main/docs/guide/getting-started.md)
- [Browser rendering](https://github.com/diegomarino/pressedslip/blob/main/docs/guide/browser-rendering.md)
- [Providers](https://github.com/diegomarino/pressedslip/blob/main/docs/guide/providers.md)
- [Custom blocks](https://github.com/diegomarino/pressedslip/blob/main/docs/guide/custom-block-walkthrough.md)
- [Themes](https://github.com/diegomarino/pressedslip/blob/main/docs/guide/themes.md)
- [Testing](https://github.com/diegomarino/pressedslip/blob/main/docs/guide/testing.md)
- [Transports](https://github.com/diegomarino/pressedslip/blob/main/docs/guide/transports.md)

## Visual Reference

The source repo ships rendered references for builtin blocks and themes:

| Default | Compact | Mono |
|---|---|---|
| ![Default theme](https://raw.githubusercontent.com/diegomarino/pressedslip/main/docs/assets/visual-refs/theme-default.png) | ![Compact theme](https://raw.githubusercontent.com/diegomarino/pressedslip/main/docs/assets/visual-refs/theme-compact.png) | ![Mono theme](https://raw.githubusercontent.com/diegomarino/pressedslip/main/docs/assets/visual-refs/theme-mono.png) |

## Reliability Notes

PNG output is deterministic enough for product workflows, but it is not
byte-identical across every operating system, Node version, and Bun version.
Differences come from underlying font rasterizers (`resvg` and skia). Avoid raw
PNG snapshot assertions; use the structural assertion helpers in
`pressedslip/testing`.

Documentation and API health are checked in CI with `pnpm docs:api`,
`pnpm check-docs`, and `pnpm check-public-docs`.

## License

MIT - see [LICENSE](LICENSE).

**Font attribution:** the test fixtures bundle JetBrains Mono Regular,
licensed under [SIL Open Font License 1.1](https://scripts.sil.org/cms/scripts/page.php?item_id=OFL).

## Contributing

See
[CONTRIBUTING.md](https://github.com/diegomarino/pressedslip/blob/main/CONTRIBUTING.md).
