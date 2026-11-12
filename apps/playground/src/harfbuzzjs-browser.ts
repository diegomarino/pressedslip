/**
 * @fileoverview Browser replacement for the `harfbuzzjs` package entry, wired
 * in through the `resolve.alias` in `vite.config.ts`.
 *
 * satori (>= 0.33) imports `harfbuzzjs`, whose default export is a promise that
 * boots the Emscripten module in `hb.js`. That module fetches `hb.wasm` from a
 * path relative to the page (`/pressedslip/hb.wasm`), which Vite never emits,
 * so the SPA fallback returns `index.html`, the wasm compile aborts, and every
 * satori render waits forever on the rejected/aborted HarfBuzz init.
 *
 * This shim builds the same promise but resolves `hb.wasm` to a Vite-emitted
 * asset URL, the same pattern used for `@resvg/resvg-wasm`. Keep the
 * `harfbuzzjs` version in `package.json` equal to the one satori pins.
 */
import createHarfBuzz from "harfbuzzjs/hb.js";
import hbWasmUrl from "harfbuzzjs/hb.wasm?url";
import hbjs from "harfbuzzjs/hbjs.js";

// biome-ignore lint/style/noDefaultExport: must mirror harfbuzzjs's default-export shape that satori imports
export default createHarfBuzz({ locateFile: () => hbWasmUrl }).then(hbjs);
