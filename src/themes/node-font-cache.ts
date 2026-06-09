/**
 * @fileoverview Node-only disk FontCache. Separate from cache.ts so the
 * bundler does not trace node:fs/promises + node:crypto into browser-safe
 * bundles (index.mjs / browser/index.mjs). Import from `pressedslip/providers`.
 * See ADR-0021 § caching.
 */
import type { FontCache } from "./types.js";

/**
 * Create a Node-only disk `FontCache` that persists resolved font bytes keyed by SHA-256(url).
 *
 * Lazy-imports `node:fs/promises` and `node:crypto` so the module is safe to bundle,
 * but throws synchronously when instantiated outside a Node.js environment.
 * Defaults to `~/.cache/pressedslip-fonts` (respecting `$XDG_CACHE_HOME`).
 * Use `memoryFontCache()` in browser contexts instead.
 *
 * @param opts Configuration object.
 * @param opts.dir Override the cache directory path; defaults to `~/.cache/pressedslip-fonts`.
 * @returns A `FontCache` implementation backed by the local filesystem.
 *
 * @example
 * ```ts
 * import { nodeFontCache, loadThemeFonts } from "pressedslip/providers";
 *
 * const cache = nodeFontCache({ dir: "/tmp/my-font-cache" });
 * const fonts = await loadThemeFonts(theme, { cache });
 * ```
 */
export function nodeFontCache(opts: { dir?: string } = {}): FontCache {
  if (typeof process === "undefined" || typeof process.versions?.node !== "string") {
    throw new Error("nodeFontCache() is Node-only; use memoryFontCache() in browser");
  }
  const dir = opts.dir;
  const cachePromise = (async () => {
    const { mkdir } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const { homedir } = await import("node:os");
    const resolvedDir =
      dir ?? resolve(process.env.XDG_CACHE_HOME ?? `${homedir()}/.cache`, "pressedslip-fonts");
    await mkdir(resolvedDir, { recursive: true }).catch(() => undefined);
    return resolvedDir;
  })();
  return {
    async get(key) {
      const { readFile } = await import("node:fs/promises");
      const { createHash } = await import("node:crypto");
      const { join } = await import("node:path");
      const cachedDir = await cachePromise;
      const fname = createHash("sha256").update(key).digest("hex");
      try {
        const bytes = await readFile(join(cachedDir, fname));
        return new Uint8Array(bytes);
      } catch {
        return undefined;
      }
    },
    async set(key, bytes) {
      const { writeFile } = await import("node:fs/promises");
      const { createHash } = await import("node:crypto");
      const { join } = await import("node:path");
      const cachedDir = await cachePromise;
      const fname = createHash("sha256").update(key).digest("hex");
      await writeFile(join(cachedDir, fname), bytes);
    },
  };
}
