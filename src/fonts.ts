/**
 * @fileoverview Browser-safe font loaders. Both helpers are pure — no `node:*`
 * imports, no global state. For local Node file paths, consumers should
 * `await readFile(path)` themselves and pass the bytes to `loadFontFromBuffer`.
 *
 * Note: `loadFontFromUrl` no longer supports `file://` URLs. See ADR-0017 for
 * migration guidance.
 */
import type { LoadedFont } from "./types.js";

type FontOpts = { weight?: number; style?: "normal" | "italic" };

/**
 * Wrap a raw TTF/OTF byte buffer as a LoadedFont.
 *
 * Applies optional weight and style metadata; defaults to weight 400, style
 * "normal" when opts are omitted. Suitable for fonts loaded from `node:fs`
 * or bundled assets.
 *
 * @param name - Font family name as Satori will reference it (e.g. `"Inter"`).
 * @param data - Raw TTF or OTF bytes.
 * @param opts - Optional weight (default 400) and style (default "normal").
 * @returns A `LoadedFont` ready to pass to `render()` via `RenderOptions.fonts`.
 * @example
 * ```ts
 * import { loadFontFromBuffer } from "pressedslip";
 * // In Node: read file via fs/promises readFile, then wrap in Uint8Array
 * const bytes = new Uint8Array(/* raw TTF buffer *\/);
 * const font = await loadFontFromBuffer("Inter", bytes, { weight: 400 });
 * ```
 */
export async function loadFontFromBuffer(
  name: string,
  data: Uint8Array,
  opts: FontOpts = {},
): Promise<LoadedFont> {
  return {
    name,
    data,
    weight: opts.weight ?? 400,
    style: opts.style ?? "normal",
  };
}

/**
 * Fetch a font from an `http(s)://` URL and return a LoadedFont.
 *
 * Uses global `fetch` (Node 22+ or browser). Throws `TypeError` for
 * unsupported URL schemes (`file://`, `data://`, etc.). For local files in
 * Node, use `loadFontFromBuffer` with bytes from `node:fs/promises` `readFile`.
 *
 * @param name - Font family name as Satori will reference it (e.g. `"Inter"`).
 * @param url - An `http://` or `https://` URL pointing to a TTF or OTF file.
 * @param opts - Optional weight (default 400) and style (default "normal").
 * @returns A `LoadedFont` ready to pass to `render()` via `RenderOptions.fonts`.
 * @example
 * ```ts
 * import { loadFontFromUrl } from "pressedslip";
 *
 * const font = await loadFontFromUrl(
 *   "Inter",
 *   "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
 *   { weight: 400 },
 * );
 * ```
 */
export async function loadFontFromUrl(
  name: string,
  url: string,
  opts: FontOpts = {},
): Promise<LoadedFont> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font fetch failed: ${url} → HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return loadFontFromBuffer(name, new Uint8Array(buffer), opts);
}
