/**
 * @fileoverview Browser-safe FontCache implementations: memory (default).
 * Node-only disk cache lives in node-font-cache.ts (separate file so the
 * bundler does not trace node:* imports into browser-safe bundles).
 * See spec §3.4 + ADR-0021.
 */
import type { FontCache } from "./types.js";

/**
 * Create an in-memory FontCache backed by a plain Map.
 *
 * Each call produces an isolated instance with no shared state. Pass the result
 * to `loadThemeFonts` via `LoadThemeFontsOptions.cache` to scope font caching
 * to a single request or session. The module-level `defaultCache` singleton
 * is used when no cache override is supplied.
 *
 * @returns A `FontCache` with async `get` and `set` backed by a `Map<string, Uint8Array>`.
 * @example
 * ```ts
 * import { memoryFontCache, loadThemeFonts, themes } from "pressedslip";
 *
 * const cache = memoryFontCache();
 * const prepared = await loadThemeFonts(themes.default, { cache });
 * ```
 */
export function memoryFontCache(): FontCache {
  const map = new Map<string, Uint8Array>();
  return {
    async get(key) {
      return map.get(key);
    },
    async set(key, bytes) {
      map.set(key, bytes);
    },
  };
}

/** Module-singleton default cache used when consumer doesn't override. */
export const defaultCache: FontCache = memoryFontCache();
