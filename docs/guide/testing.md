# Testing rendering code

When testing `pressedslip`, avoid byte-level PNG snapshots. The render pipeline
uses Satori/resvg and font rasterization, so byte output can change across
platforms or dependency versions even when the rendered content is acceptable.

Use the helpers from `pressedslip/testing` to assert structure and render
success instead.

## What each helper accepts

| Helper | Input shape | Purpose |
|---|---|---|
| `assertNoFailedBlocks` | Any object with optional `failedBlocks` | Smoke-test `Rendering` or `Composition` failures. |
| `assertStructurallyEqual` | Any two values | Compare objects while treating byte buffers by length. |
| `assertBlockCount` | `{ blocks: Array<{ type: string }> }` | Check fixture/replay block-list length. |
| `assertBlockTypes` | `{ blocks: Array<{ type: string }> }` | Check fixture/replay block-list order. |

`render()` returns a `Rendering`, not a block list. Use
`assertNoFailedBlocks(rendering)` for render output. For block count/type
assertions against a current `Composition`, derive a small block-list view from
`composition.slots`.

## Render smoke test

```ts
import { builtinBlocks, createRegistry, render, themes, type Composition } from "pressedslip";
import { assertNoFailedBlocks, assertStructurallyEqual } from "pressedslip/testing";

const registry = createRegistry(builtinBlocks);
const composition: Composition = {
  id: "test-render",
  version: 1,
  date: "2026-06-08",
  status: "ready",
  slots: [
    {
      index: 0,
      blockType: "textCell",
      title: "Note",
      data: { text: "Hello from a test" },
    },
  ],
  failedBlocks: [],
  providerOutcomes: {},
  timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
};

const rendering = await render(composition, { registry, theme: themes.default });

assertNoFailedBlocks(rendering);
assertStructurallyEqual(
  { ...rendering, bytes: new Uint8Array(rendering.bytes.length) },
  {
    bytes: new Uint8Array(rendering.bytes.length),
    failedBlocks: [],
    format: "png-1bit",
    width: 576,
    height: rendering.height,
  },
);
```

## Composition block order

```ts
import { assertBlockCount, assertBlockTypes } from "pressedslip/testing";

const blockList = {
  blocks: composition.slots.map((slot) => ({ type: slot.blockType })),
};

assertBlockCount(blockList, 1);
assertBlockTypes(blockList, ["textCell"]);
```

This keeps the helper contract explicit: `assertBlockCount` and
`assertBlockTypes` are for block-list-like fixtures, not raw render output.

## Fixtures

`builtinFixtures` provides valid data payloads for every builtin block type:

```ts
import { builtinFixtures } from "pressedslip/testing";

const text = builtinFixtures.textCell.basic;
const kpi = builtinFixtures.kpi.basic;
const list = builtinFixtures.list.basic;
const qa = builtinFixtures.qaPair.basic;
const quote = builtinFixtures.quotation.basic;
const keyValue = builtinFixtures.keyValue.basic;
const wordSearch = builtinFixtures.wordSearch.basic;
```

Fixture scenario keys are useful for tests and examples, but they are not
semver-stable API. Prefer asserting on data shape and rendered failures rather
than on fixture key names.

## Byte comparison

`assertStructurallyEqual` compares `Uint8Array` and `Buffer` values by length by
default. Pass `{ ignoreBuffers: false }` only when you intentionally want a
byte-exact comparison in a fully controlled environment.
