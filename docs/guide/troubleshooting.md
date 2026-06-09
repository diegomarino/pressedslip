# Troubleshooting

Diagnose and fix your most common errors.

## Font issues

### I see `Font fetch failed: ${url} → HTTP ${status}`

Your font URL returned a non-2xx HTTP status code (e.g., 404, 403, 500).

**Diagnosis:** The URL is either unreachable, behind authentication, or has moved.

**Fix:**

1. Verify the URL with `curl -I <url>` to check the response status and headers.
2. Check CORS headers if loading from a CDN in a browser context.
3. If using Google Fonts, ensure the full URL is correct — copy the exact link from [fonts.google.com](https://fonts.google.com).

**See also:** [Themes guide](./themes.md) § "Font loading and caching"

---

### I see `nodeFontCache() is Node-only; use memoryFontCache() in browser`

You called `nodeFontCache()` in a browser environment.

**Diagnosis:** `nodeFontCache()` requires Node.js `fs` and `crypto` modules, which don't exist in browsers.

**Fix:**

- In Node (backend): use `nodeFontCache()` normally.
- In browser: use `memoryFontCache()` instead, or omit the cache argument (defaults to memory).

```ts
import { memoryFontCache, loadThemeFonts } from "pressedslip";

const prepared = await loadThemeFonts(theme, { cache: memoryFontCache() });
```

---

### Font isn't rendering (missing glyphs or fallback behavior)

Your font loaded successfully, but output doesn't use it.

**Diagnosis:** Satori (the JSX-to-SVG engine) couldn't find a registered font for a text role, or the font file is corrupt.

**Fix:**

1. Ensure `loadThemeFonts()` or `loadFontFromBuffer()` finished before calling `render()`.
2. Check that your font file is a valid TTF or OTF (not WOFF, WOFF2, or web fonts).
3. Verify the font family name matches what your CSS references (case-sensitive).

**See also:** [Themes guide](./themes.md) § "Font format and compatibility"

---

## Composition and block errors

### I see `Unknown block type: ${type}`

Your composition references a block type that isn't registered.

**Diagnosis:** Either the block wasn't included in your registry, or there's a typo in the type name.

**Fix:**

1. Check that the block is included in your registry:

   ```ts
   const registry = createRegistry([...builtinBlocks, myCustomBlock]);
   // Verify myCustomBlock.type matches the type in your composition
   ```

2. Verify the exact spelling of `type` in your composition slots matches the registered block's `type`.

**See also:** [Custom Block Walkthrough](./custom-block-walkthrough.md)

---

### I see `Duplicate block type in registry: ${type}`

You passed two block definitions with the same `type` string to `createRegistry()`.

**Diagnosis:** Either you defined a custom block with the same type as a builtin, or you accidentally added the same block twice.

**Fix:**

```ts
// ❌ Wrong — kpi is in builtinBlocks AND myKpiBlock
const registry = createRegistry([...builtinBlocks, myKpiBlock]);

// ✅ Correct — use only builtinBlocks, or fork kpi with a different type
const myCustomKpi = defineBlock({
  type: "kpi-variant",  // different type
  schema: myKpiBlock.schema,
  render: myKpiBlock.render,
});
const registry = createRegistry([...builtinBlocks, myCustomKpi]);
```

---

### I see `Schema validation failed: ${message}`

Block data didn't match the registered block's Zod schema.

**Diagnosis:** Your composition slot includes data that doesn't conform to the block's shape — missing required fields, wrong types, invalid enum values, etc.

**Fix:**

1. Check the error message for which field failed (e.g., `"title" is required`).
2. Verify your slot data matches the block's schema:

   ```ts
   import { z } from "zod";
   import { builtinBlocks } from "pressedslip";
   
   const kpiBlock = builtinBlocks.find(b => b.type === "kpi");
   console.log(kpiBlock.schema);  // inspect the shape
   ```

3. Use TypeScript inference to catch mismatches at compile time:

   ```ts
   import type { KpiData } from "pressedslip";
   
   const data: KpiData = { label: "Uptime", value: "99.9%" };  // TS checks this
   ```

**See also:** [Custom Block Walkthrough](./custom-block-walkthrough.md) § "Defining the schema"

---

### I see `Block render threw` with a stack trace

Your block's render function (React component) threw an error.

**Diagnosis:** The component code has a bug — a null dereference, missing prop, or logic error.

**Fix:**

1. Check the stack trace in your logs to find the line number.
2. Add defensive checks for optional fields:

   ```ts
   const render = ({ data, ctx }: { data: MyBlockData; ctx: RenderContext }) => {
     if (!data.items || data.items.length === 0) {
       return <div>No data</div>;  // graceful fallback
     }
     return <div>{data.items.map(...)}</div>;
   };
   ```

3. Test your render function with `defineBlock` fixtures before deploying.

---

## Width and dimension errors

### I see `RenderOptions.width.px must be divisible by 8 (got ${px})`

Your width in pixels is not a multiple of 8.

**Diagnosis:** Thermal printers and bitmap codecs require 8-pixel alignment for row packing. A width like 577 or 382 violates this constraint.

**Fix:**

- Use an 8-divisible value: 384, 576, 832, or a value you compute with `Math.ceil(n / 8) * 8`.
- If using `PAPER` presets, they are pre-aligned: `PAPER.thermal58.px = 384`, etc.

```ts
import { PAPER } from "pressedslip";

// ✅ Correct — PAPER presets are 8-aligned
const { bytes } = await render(composition, { width: PAPER.thermal58 });

// ✅ Correct — explicit px, 8-aligned
const { bytes } = await render(composition, { width: { px: 576 } });

// ❌ Wrong — not divisible by 8
const { bytes } = await render(composition, { width: { px: 577 } });
```

---

### I see `PNG width ${width} ≠ PRINT_WIDTH_DOTS` or `PNG height must be in 1..${max}`

Your PNG has wrong dimensions for ESC/POS printing.

**Diagnosis:** You're using the `createEscPosTransport()` directly with a PNG that doesn't match thermal printer constraints (576px width, height ≤ 4096px).

**Fix:**

1. Ensure your composition renders to exactly 576px width (for 80mm thermal printers).
2. Check the height is between 1 and 4096 pixels.
3. If you need a different width, either use a different PAPER preset or adjust your theme.

```ts
import { PAPER } from "pressedslip";

const { bytes: png } = await render(composition, { width: PAPER.thermal80 });
// Now png is guaranteed 576 × (1..4096) pixels
const raster = await pngToEscPosRaster(new Uint8Array(png));
```

**See also:** [Getting Started](./getting-started.md) § "Paper sizes and widths"

---

### I see `width must be divisible by 8` (during bitmap conversion)

Internal pipeline error during 1-bit PNG → thermal format conversion.

**Diagnosis:** A width validation was missed in an earlier pipeline step. This is usually a framework bug, not user error.

**Fix:**

1. Check that `RenderOptions.width` is 8-aligned (see "width.px must be divisible by 8" above).
2. If you're calling `rgbaToOneBit()` or `encodeOneBitPng()` directly, ensure your `width` parameter is 8-aligned.
3. File an issue if the error occurs with a valid `RenderOptions.width`.

---

## Browser and WebAssembly errors

### I see `svgToRgbaWasm: 'wasm' argument is required`

You forgot to provide the WebAssembly binary, or it resolved to `undefined` or `null`.

**Diagnosis:** `render()` on the browser cannot convert SVG to bitmap without the `@resvg/resvg-wasm` binary. You must pass it via `RenderOptions.wasm`.

**Fix:**

```ts
import { render } from "pressedslip/browser";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";

const { bytes } = await render(composition, {
  wasm: wasmUrl,  // required for browser render
});
```

If using Create React App (no `?url` support):

```ts
// Copy node_modules/@resvg/resvg-wasm/index_bg.wasm to public/wasm/
const { bytes } = await render(composition, {
  wasm: "/wasm/index_bg.wasm",
});
```

**See also:** [Browser Rendering](./browser-rendering.md) § "Provide the WebAssembly binary"

---

### Render produces different output in browser vs Node

Browser and Node rendering paths have subtle differences.

**Diagnosis:** Font deferred loading, WebAssembly rounding, or SVG feature support can differ between `@resvg/resvg-js` (Node) and `@resvg/resvg-wasm` (browser).

**Fix:**

1. Ensure both paths load the same fonts and theme.
2. Check that all fonts are available (no missing-font fallback).
3. Use the same PAPER width preset in both paths.
4. Test with a known composition in both environments to catch divergences early.

**See also:** [Browser Rendering](./browser-rendering.md) § "Known differences from Node rendering"

---

## Provider and orchestration errors

### I see `compose: providers registry is required`

You called `compose()` without passing `options.providers`.

**Diagnosis:** The orchestrator needs a provider registry to resolve block dependencies, even if you don't use any providers.

**Fix:**

```ts
import { compose } from "pressedslip";
import { createProviderRegistry } from "pressedslip/providers";

// At minimum, create an empty registry
const providers = createProviderRegistry({});

const composition = await compose({
  providers,
  blocks: myRegistry,
  date: "2026-05-24",
});
```

---

### I see `compose: ctx.subjectId is required (non-empty string) when any provider has scope:'personal'`

You used a personal-scoped provider but didn't pass `ctx.subjectId`.

**Diagnosis:** Personal-scoped providers need a subject identifier for cache keying and data isolation.

**Fix:**

```ts
const composition = await compose({
  providers,
  blocks,
  date: "2026-05-24",
  ctx: {
    subjectId: "user-42",  // required for personal-scoped providers
  },
});
```

---

### I see `compose: ctx.hour is required (0-23) when any provider has freshness:'per-hour'`

You used a provider with `freshness: "per-hour"` but didn't pass `ctx.hour`.

**Diagnosis:** Hour-fresh providers cache results per hour, so the orchestrator needs the current hour (0–23) to determine cache validity.

**Fix:**

```ts
const now = new Date();
const composition = await compose({
  providers,
  blocks,
  date: "2026-05-24",
  ctx: {
    hour: now.getHours(),  // required for per-hour providers
  },
});
```

---

### I see `createProviderRegistry: duplicate provider.key '${key}'`

You registered two providers with the same `key` in your provider registry.

**Diagnosis:** Provider keys must be unique for cache lookup and orchestrator routing.

**Fix:**

```ts
const registry = createProviderRegistry({
  weather: createOpenMeteoProvider({ key: "weather" }),
  quote: createFixturePoolProvider({ key: "quote", pool: [...] }),
  // ❌ Wrong — "weather" is used twice
  // weather2: createOpenMeteoProvider({ key: "weather" }),
});
```

---

### I see `render returns failedBlocks`

One or more blocks couldn't be rendered (validation or execution failure).

**Diagnosis:** A block's schema validation failed, the block type is unknown, or the render function threw.

**Fix:**

1. Check the `result.failedBlocks` array for details on which blocks failed and why.
2. Use the testing assertion helpers to catch failures in tests before deployment:

   ```ts
   import { assertNoFailedBlocks } from "pressedslip/testing";
   
   const result = await render(composition, options);
   assertNoFailedBlocks(result);  // throws if failedBlocks is non-empty
   ```

3. See the block-specific errors above (Unknown block type, Schema validation failed, etc.) for remediation.

---

## HTTP transport errors

### I see `Invalid URL: ${url}`

The URL failed to parse (syntax error or unsupported scheme).

**Diagnosis:** The URL is malformed, or uses a scheme other than `http://` or `https://`.

**Fix:**

```ts
import { createHttpTransport } from "pressedslip/transports";

// ❌ Wrong — file:// not supported
const transport = createHttpTransport({ url: "file:///tmp/data" });

// ✅ Correct — http or https only
const transport = createHttpTransport({ url: "https://print.example.com/receipt" });
```

---

### I see `HTTP ${status} ${statusText}`

The print server returned a 4xx or 5xx response.

**Diagnosis:** Either your payload was rejected (4xx), or the server encountered an error (5xx).

**Fix:**

1. Check the `status` code in the error. Common codes:
   - `400 Bad Request` — payload format mismatch (check `Content-Type`).
   - `403 Forbidden` — auth failure or SSRF blocked by allowlist.
   - `404 Not Found` — wrong endpoint URL.
   - `500+ Server Error` — server is down or misconfigured.
2. Verify the server is running and reachable with `curl -X POST https://...`.
3. Check the server logs for more details.

---

### I see `Origin "${origin}" not in allowedHosts`

The URL origin wasn't in your SSRF allowlist.

**Diagnosis:** You set `allowedHosts` for SSRF protection, but the destination URL's origin doesn't match any entry.

**Fix:**

```ts
import { createHttpTransport } from "pressedslip/transports";

const transport = createHttpTransport({
  url: "https://print.example.com:443/receipt",
  // allowedHosts entries must be full origins: scheme://host:port
  allowedHosts: [
    "https://print.example.com:443",  // ✅ matches the URL
    // "https://print.example.com" would NOT match (missing port 443)
  ],
});
```

---

## Input validation errors

### I see `compose: date must be 'YYYY-MM-DD'; got '${date}'`

Your `compose()` call passed a date string in the wrong format.

**Diagnosis:** The orchestrator expects ISO 8601 date format (e.g., "2026-05-24"), not other formats like "05/24/2026" or "24-May-2026".

**Fix:**

```ts
const composition = await compose({
  providers,
  blocks,
  date: new Date().toISOString().split("T")[0],  // "2026-05-24"
});
```

---

### I see `block '${type}' declares dependency '${key}' but no provider with that key is registered`

A block requires a provider that isn't in your registry.

**Diagnosis:** Either the provider key is misspelled, or the provider wasn't added to your registry.

**Fix:**

1. Check the block's `dependencies` array:

   ```ts
   const myBlock = builtinBlocks.find(b => b.type === "weather");
   console.log(myBlock.dependencies);  // ["weather"]
   ```

2. Ensure the provider registry has a matching key:

   ```ts
   const providers = createProviderRegistry({
     weather: createOpenMeteoProvider({ key: "weather" }),  // matches the dependency
   });
   ```

---

## Testing assertion failures

### I see `assertBlockCount: expected ${expected}, got ${actual}`

Your rendering produced a different number of blocks than expected.

**Diagnosis:** Either a block was skipped (due to `onlyTypes`, a provider failure, or a schema error), or your composition has the wrong number of slots.

**Fix:**

```ts
import { assertBlockCount } from "pressedslip/testing";

const result = await render(composition, options);
// Check which blocks were rendered vs failed
console.log(result.blocks.length, result.failedBlocks);
assertBlockCount(result, expectedCount);
```

---

### I see `assertBlockTypes: expected types [...], got [...]`

Block types don't match the expected sequence.

**Diagnosis:** Either blocks were rendered out of order, skipped, or replaced with errors.

**Fix:**
Check which blocks are in `result.blocks` vs `result.failedBlocks`, and verify your composition slot order matches expectations.

---

### I see `assertNoFailedBlocks: found ${count} failed block(s)`

One or more blocks failed during rendering.

**Diagnosis:** See "render returns failedBlocks" above.

**Fix:**

```ts
import { assertNoFailedBlocks } from "pressedslip/testing";

const result = await render(composition, options);
assertNoFailedBlocks(result);  // throws with details if failures found
```

---

### I see `assertStructurallyEqual: divergence at $.blocks[${i}].${field}`

Two renderings differ structurally (a block's data shape changed).

**Diagnosis:** Used for regression testing; either the expected rendering changed, or your code produced a different block structure.

**Fix:**

```ts
import { assertStructurallyEqual } from "pressedslip/testing";

const currentResult = await render(composition, options);
const expectedResult = { /* baseline from marplanner or file */ };
assertStructurallyEqual(currentResult, expectedResult);
```

Update the baseline if the change is intentional.

---

## Still stuck?

If your error isn't listed here:

1. **Read the error message carefully** — most include the problem (e.g., `"Unknown block type"`, `"HTTP 403"`) and a hint.
2. **Check the stack trace** — it points to the line of code that failed.
3. **Search the source code** for the error message in [src/](../../../src/) to find the check that triggered it.
4. **Review the relevant guide** — [Themes](./themes.md), [Custom Blocks](./custom-block-walkthrough.md), [Providers](./providers.md), or [Browser Rendering](./browser-rendering.md).
5. **Check the TSDoc on public exports** — `pressedslip` includes inline `@param`, `@returns`, and `@throws` documentation on all APIs.
