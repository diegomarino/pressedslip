/**
 * @fileoverview Wasm-backed SVG→RGBA step for the `/browser` render path.
 * Uses `@resvg/resvg-wasm` with caller-provided wasm binary (DI). The wasm
 * init promise is cached at module scope so repeated calls in the same
 * process amortize the wasm boot cost. The caller chooses how to source the
 * wasm bytes (Node `fs.readFile`, Vite `?url` + `fetch`, etc.) — this module
 * has zero `node:*` imports so it stays browser-safe.
 *
 * See ADR-0018 for bootstrapping patterns.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm";

// Local DOM-lib equivalents — the project's tsconfig uses `lib: ["ES2023"]`
// without DOM, so `BufferSource` is not globally available. These aliases
// match the lib.dom.d.ts definitions exactly.
type WasmBufferSource = ArrayBufferView | ArrayBuffer;
/**
 * Acceptable input shapes for initializing the `@resvg/resvg-wasm` runtime.
 * Mirrors the upstream `initWasm` signature: either a buffer holding the wasm
 * binary, or a `Response` (sync or pending) whose body is the wasm binary —
 * lets browser callers pass `fetch(wasmUrl)` directly without awaiting.
 */
export type WasmInput = WasmBufferSource | Response | Promise<Response>;

let initPromise: Promise<void> | null = null;

async function ensureInit(wasm: WasmInput): Promise<void> {
  if (initPromise !== null) return initPromise;
  initPromise = initWasm(wasm as WasmBufferSource).catch((err: unknown) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}

/**
 * Rasterize an SVG string to RGBA bytes at the requested width. The aspect
 * ratio of the SVG is preserved (height is computed by resvg).
 *
 * @param svg — SVG source string.
 * @param widthPx — target raster width in pixels.
 * @param wasm — the `@resvg/resvg-wasm` binary. Required. See ADR-0018.
 */
export async function svgToRgbaWasm(
  svg: string,
  widthPx: number,
  wasm: WasmInput,
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
  // Defensive runtime guard: TS-typed but JS consumers may pass through
  // undefined unexpectedly (e.g. `fetch(maybeUrl)` resolving to null on 4xx).
  // ADR-0018 declares `wasm` a required contract — fail loudly here rather
  // than letting initWasm produce a cryptic "Invalid BufferSource" later.
  if (wasm === undefined || wasm === null) {
    throw new TypeError("svgToRgbaWasm: 'wasm' argument is required");
  }
  await ensureInit(wasm);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: widthPx },
    // White background — see src/pipeline/svg-to-bitmap.ts for rationale.
    // Defense in depth with composeTree's wrapper backgroundColor; keeps the
    // Node and wasm render paths byte-identical (enforced by parity gate).
    background: "white",
  });
  const rendered = resvg.render();
  return {
    rgba: rendered.pixels,
    width: rendered.width,
    height: rendered.height,
  };
}
