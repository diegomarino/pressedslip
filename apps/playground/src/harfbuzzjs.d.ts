/** @fileoverview Minimal types for the harfbuzzjs internals used by `harfbuzzjs-browser.ts`. */

declare module "harfbuzzjs/hb.js" {
  /** Emscripten module factory; resolves to the raw HarfBuzz wasm instance. */
  // biome-ignore lint/style/noDefaultExport: describes an external CommonJS module.exports
  export default function createHarfBuzz(moduleArg?: {
    locateFile?: (path: string, scriptDirectory: string) => string;
  }): Promise<unknown>;
}

declare module "harfbuzzjs/hbjs.js" {
  /** Wraps the raw wasm instance in the JS API satori consumes. */
  // biome-ignore lint/style/noDefaultExport: describes an external CommonJS module.exports
  export default function hbjs(instance: unknown): unknown;
}
