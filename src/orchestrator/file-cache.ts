/**
 * @fileoverview Disk-backed cache implementation (Node-only). Atomic temp+rename writes, JSON serialization, TTL via per-entry expiresAt sidecar.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Cache } from "../types.js";

type Envelope = { value: unknown; expiresAt: number | undefined };

function keyToFilename(key: string): string {
  // SHA-256 hex truncated to 32 chars (128 bits) — plenty for collision
  // resistance at expected cache sizes (millions of entries before birthday-
  // bound risk), and keeps filenames short for filesystems with path limits.
  return `${createHash("sha256").update(key).digest("hex").slice(0, 32)}.json`;
}

/**
 * Create a disk-backed `Cache` rooted at `dir`. Directory is created on first use if absent.
 *
 * Keys are SHA-256-hashed to filenames; values are JSON-serialized inside an envelope that
 * stores `expiresAt`. Writes are atomic via temp-file + rename. Expiry is checked at read
 * time; stale entries are deleted lazily. Node-only — not safe to import from `/browser`.
 *
 * @param opts - Configuration object.
 * @param opts.dir - Absolute or relative path to the cache directory.
 * @returns A `Cache` implementation backed by the local filesystem.
 *
 * @example
 * ```ts
 * import { createFileCache } from "pressedslip/providers";
 *
 * const cache = createFileCache({ dir: "/tmp/pressedslip-cache" });
 * await cache.set("key", { temperature: 22 }, 3_600_000); // 1 h TTL
 * const value = await cache.get<{ temperature: number }>("key");
 * ```
 */
export function createFileCache({ dir }: { dir: string }): Cache {
  mkdirSync(dir, { recursive: true });

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const path = join(dir, keyToFilename(key));
      if (!existsSync(path)) return undefined;
      try {
        const raw = readFileSync(path, "utf8");
        const envelope: Envelope = JSON.parse(raw);
        if (envelope.expiresAt !== undefined && Date.now() > envelope.expiresAt) {
          try {
            unlinkSync(path);
          } catch {
            /* ignore */
          }
          return undefined;
        }
        return envelope.value as T;
      } catch {
        // Treat any read/parse failure (truncated file, mid-write race,
        // disk error, JSON corruption) as a cache miss. The next `set` will
        // overwrite the bad entry. ADR-0014 alignment: this is intentional
        // miss semantics, not silent-swallow — the cache is an optimization,
        // not a source of truth; failure to read just costs one re-fetch.
        return undefined;
      }
    },
    async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
      const expiresAt = ttlMs === undefined ? undefined : Date.now() + ttlMs;
      const envelope: Envelope = { value, expiresAt };
      const final = join(dir, keyToFilename(key));
      const tmp = `${final}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(envelope), "utf8");
      renameSync(tmp, final);
    },
    async delete(key: string): Promise<void> {
      const path = join(dir, keyToFilename(key));
      try {
        unlinkSync(path);
      } catch {
        /* idempotent */
      }
    },
    async clear(): Promise<void> {
      for (const f of readdirSync(dir)) {
        if (f.endsWith(".json")) {
          try {
            unlinkSync(join(dir, f));
          } catch {
            /* ignore */
          }
        }
      }
    },
  };
}
