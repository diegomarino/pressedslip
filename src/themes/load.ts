/**
 * @fileoverview Load font binaries declared in a ThemeTemplate. Caches per
 * URL via the provided FontCache (default: memory singleton). Deduplicates
 * the flat fonts[] by name+weight+style (codex F11). Graceful degradation
 * via onFontLoadError option (codex F5).
 */
import { loadFontFromBuffer } from "../fonts.js";
import { applyHeaderDefaults, applyShellDefaults } from "./apply-defaults.js";
import { defaultCache } from "./cache.js";
import type { FontCache, FontSpec, FontUrlSpec, PreparedTheme, ThemeTemplate } from "./types.js";
import { validateTheme } from "./validate.js";

/** Options controlling fetch, caching, and error handling for loadThemeFonts. */
export type LoadThemeFontsOptions = {
  /** Font byte cache to use; pass null to disable caching entirely. Defaults to module-level memory singleton. */
  cache?: FontCache | null;
  /** Custom fetch implementation; defaults to the global fetch. Useful for testing or server-side proxy. */
  fetcher?: typeof fetch;
  /** On font URL fetch failure: 'throw' (default) aborts the call; 'warn-skip' logs and continues. */
  onFontLoadError?: "throw" | "warn-skip";
  /** Logger used for warn-skip messages; defaults to console. Must implement warn(). */
  logger?: {
    /** Log a warning-level message. */
    warn: (msg: string) => void;
  };
};

/**
 * Prepare a theme by resolving all declared font URLs into a PreparedTheme.
 *
 * Fetches each URL through the provided `FontCache` (default: module-level
 * memory singleton). Deduplicates the flat `fonts[]` array by
 * `name+weight+style` triple. On URL failure, either throws (default) or
 * logs a warning and skips the font per `onFontLoadError`.
 *
 * @param template - A ThemeTemplate declaring font URLs to load.
 * @param options - Optional cache, custom fetcher, error policy, and logger.
 * @returns A `PreparedTheme` ready to pass to `render()` via `RenderOptions.theme`.
 * @example
 * ```ts
 * import { loadThemeFonts, themes, render, createRegistry, builtinBlocks } from "pressedslip";
 *
 * const prepared = await loadThemeFonts(themes.default);
 * const registry = createRegistry(builtinBlocks);
 * // const { bytes } = await render(composition, { registry, theme: prepared });
 * ```
 */
export async function loadThemeFonts(
  template: ThemeTemplate,
  options: LoadThemeFontsOptions = {},
): Promise<PreparedTheme> {
  const cache = options.cache ?? defaultCache;
  const fetcher = options.fetcher ?? fetch;
  const onError = options.onFontLoadError ?? "throw";
  const logger = options.logger ?? console;

  const allEntries: Array<{ role: string; spec: FontUrlSpec }> = [];
  for (const [role, specs] of Object.entries(template.roleUrls)) {
    if (specs === undefined) continue;
    for (const spec of specs) allEntries.push({ role, spec });
  }
  for (const [role, specs] of Object.entries(template.extraUrls ?? {})) {
    for (const spec of specs) allEntries.push({ role, spec });
  }

  const fontRoles: Record<string, FontSpec[]> = {};
  const dedup = new Map<string, FontSpec>();

  const results = await Promise.allSettled(
    allEntries.map((entry) => loadOne(entry.spec, cache, fetcher)),
  );

  for (let i = 0; i < results.length; i++) {
    const entry = allEntries[i];
    const result = results[i];
    if (entry === undefined || result === undefined) continue;
    if (result.status === "rejected") {
      if (onError === "throw") throw result.reason;
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      logger.warn(
        `[theme] failed to load ${entry.spec.family} ${entry.spec.weight} ${entry.spec.style} from ${entry.spec.url}: ${reason}`,
      );
      continue;
    }
    const fs = result.value;
    const key = `${fs.name}|${fs.weight}|${fs.style}`;
    const fontSpec = dedup.get(key) ?? fs;
    dedup.set(key, fontSpec);
    const roleArr = fontRoles[entry.role];
    if (roleArr !== undefined) {
      roleArr.push(fontSpec);
    } else {
      fontRoles[entry.role] = [fontSpec];
    }
  }

  const result: PreparedTheme = {
    _kind: "prepared",
    id: template.id,
    label: template.label,
    fonts: Array.from(dedup.values()),
    fontRoles,
    shell: applyShellDefaults(template.shell),
    header: applyHeaderDefaults(template.header),
  };
  validateTheme(result);
  return result;
}

async function loadOne(
  spec: FontUrlSpec,
  cache: FontCache,
  fetcher: typeof fetch,
): Promise<FontSpec> {
  let bytes = await cache.get(spec.url);
  if (bytes === undefined) {
    const res = await fetcher(spec.url);
    if (!res.ok) {
      throw new Error(`Font fetch failed: ${spec.url} → HTTP ${res.status}`);
    }
    bytes = new Uint8Array(await res.arrayBuffer());
    await cache.set(spec.url, bytes);
  }
  return loadFontFromBuffer(spec.family, bytes, {
    weight: spec.weight,
    style: spec.style,
  });
}
