# Glossary

Shared vocabulary for current `pressedslip` docs, API reference, and
architecture pages.

## Block Definition

A renderable visual primitive created with `defineBlock({ type, schema, render,
shell?, dependencies?, hints? })`. The schema validates slot data and `render`
returns the React tree for that block.

Builtin block definitions are exported individually (`textCellBlock`,
`keyValueBlock`, `kpiBlock`, `listBlock`, `qaPairBlock`, `quotationBlock`,
`wordSearchBlock`) and collectively as `builtinBlocks`.

## Block Type

The stable dispatch string for a block definition, such as `"textCell"` or
`"wordSearch"`. A composition slot uses `blockType` to select the matching
definition from a registry.

## Composition

The serializable render envelope passed to `render()`. It contains ordered
`slots`, `failedBlocks`, `providerOutcomes`, timing data, and status metadata.
`compose()` can produce a composition from providers; consumers can also build
one directly.

## Slot

One ordered composition entry:

```ts
{
  index: 0,
  blockType: "textCell",
  title: "Note",
  data: { text: "Hello" },
}
```

`data` is validated against the block definition schema during render.

## Registry

An immutable lookup table created with `createRegistry([...builtinBlocks,
customBlock])`. `render()` uses it to resolve each slot's `blockType`. Registry
construction throws on duplicate block type keys.

## Provider

An async data source created with `defineProvider()` or helper factories such as
`createStaticTextProvider()` and `createOpenMeteoProvider()`. Providers return
`ProviderResult` values and are orchestrated by `compose()`.

## Provider Registry

A key-consistent provider map created with `createProviderRegistry()`. It is
separate from the block registry: provider registries fetch data; block
registries render data.

## Theme Template

URL-based theme input (`ThemeTemplate`) containing font URL registries plus
shell/header styling. Pass it to `loadThemeFonts()` or directly to `render()`
for lazy loading.

## Prepared Theme

A resolved theme (`PreparedTheme`) with font bytes already loaded. Use this when
you want explicit control over font loading and caching.

## Rendering

The result of `render()`: 1-bit PNG bytes, dimensions, format, and any
`failedBlocks`. PNG bytes are suitable for file output, browser previews, or
transport delivery.

## Transport

A Node-only delivery adapter from `pressedslip/transports`. Reference transports
include ESC/POS, file, and HTTP.

## Browser Entry

`pressedslip/browser`, the browser-safe entrypoint. It uses `@resvg/resvg-wasm`
and requires a wasm URL or response in `BrowserRenderOptions.wasm`.

## Public API Reference

The committed API overview lives at `docs/api/README.md`. The complete
symbol-by-symbol TypeDoc site is generated into `docs/api/reference/` with:

```bash
pnpm docs:api
```
