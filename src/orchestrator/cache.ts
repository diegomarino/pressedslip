/**
 * @fileoverview In-memory cache implementation conforming to the Cache interface in src/types. Default cache supplied by the orchestrator when the consumer does not pass one via ComposeOptions.cache.
 */
import type { Cache } from "../types.js";

type Entry = { value: unknown; expiresAt: number | undefined };

/**
 * Create an in-memory cache backed by a Map.
 *
 * TTL eviction is lazy — entries expire on the next `get` call after their
 * deadline, not on a background timer. Suitable as the default ephemeral cache
 * for a single `compose()` run. Pass the result as `ComposeOptions.cache` to
 * share one cache across multiple calls.
 *
 * @returns A `Cache` implementation with get, set, delete, and clear.
 * @example
 * ```ts
 * import { createMemoryCache, compose, createRegistry, builtinBlocks } from "pressedslip";
 *
 * const cache = createMemoryCache();
 * const registry = createRegistry(builtinBlocks);
 * const composition = await compose({ providers: {}, blocks: registry, date: "2026-01-15", cache });
 * ```
 */
export function createMemoryCache(): Cache {
  const store = new Map<string, Entry>();

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const entry = store.get(key);
      if (entry === undefined) return undefined;
      if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value as T;
    },
    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
      const expiresAt = ttlMs === undefined ? undefined : Date.now() + ttlMs;
      store.set(key, { value, expiresAt });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async clear(): Promise<void> {
      store.clear();
    },
  };
}
