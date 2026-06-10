/**
 * @fileoverview compose() orchestrator entry point. Runs the 8-step pipeline
 * from spec §5.2 and returns a Composition. Programmer errors throw; operational
 * outcomes return via Composition.status.
 *
 * Pipeline steps:
 *  1. Validate inputs — throw on programmer errors before any side effects.
 *  2. Resolve enabled blocks — evaluate isEnabled() for each block.
 *  3. Compute requested providers — union of dependencies across enabled blocks.
 *  4. Fetch providers — cache + timeout + mode policy (parallel-soft / parallel-hard).
 *  5. Render enabled blocks — route outcomes, produce slots or FailedBlock entries.
 *  6. Retain previous slots — M4: re-merge onlyTypes partial renders.
 *  7. Compute status — normative _computeStatus truth table.
 *  8. Assemble Composition — return the final envelope.
 */

import { noopLogger } from "../logger.js";
import { SHELL_DEFAULTS } from "../themes/apply-defaults.js";
import type {
  AnyBlockDefinition,
  Cache,
  ComposeOptions,
  Composition,
  FailedBlock,
  ProviderContext,
  ProviderDefinition,
  ProviderOutcome,
  ProviderResult,
  RenderContext,
  Slot,
} from "../types.js";
import { createMemoryCache } from "./cache.js";
import { deriveCacheKey } from "./cache-key.js";
import { _computeStatus } from "./compute-status.js";
import { fnv1a32, mulberry32 } from "./prng.js";
import { isProgrammerError, toSerializableError } from "./serializable-error.js";
import { withTimeout } from "./timeout.js";

// ─── Step 1: Input validation ─────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateInputs<P extends Record<string, ProviderDefinition<unknown>>>(
  options: ComposeOptions<P>,
): void {
  if (options.providers === undefined || options.providers === null) {
    throw new Error("compose: providers registry is required");
  }
  if (options.blocks === undefined || options.blocks === null) {
    throw new Error("compose: blocks registry is required");
  }
  if (typeof options.date !== "string" || !DATE_RE.test(options.date)) {
    throw new Error(`compose: date must be 'YYYY-MM-DD'; got '${options.date}'`);
  }

  for (const block of options.blocks.list()) {
    const deps = (block as AnyBlockDefinition).dependencies ?? [];
    for (const dep of deps) {
      if (!(dep in options.providers)) {
        throw new Error(
          `compose: block '${block.type}' declares dependency '${dep}' but no provider with that key is registered`,
        );
      }
    }
  }

  if (options.onlyTypes !== undefined && options.onlyTypes !== null) {
    if (options.previousComposition === undefined) {
      throw new Error("compose: onlyTypes requires previousComposition");
    }
  }

  const providers = Object.values(options.providers) as ProviderDefinition<unknown>[];
  const needsSubject = providers.some((p) => p.scope === "personal");
  const needsHour = providers.some((p) => p.freshness === "per-hour");

  if (needsSubject) {
    const subjectId = (options.ctx as { subjectId?: unknown } | undefined)?.subjectId;
    if (typeof subjectId !== "string" || subjectId === "") {
      throw new Error(
        "compose: ctx.subjectId is required (non-empty string) when any provider has scope:'personal'",
      );
    }
  }

  if (needsHour) {
    const hour = (options.ctx as { hour?: unknown } | undefined)?.hour;
    if (typeof hour !== "number" || hour < 0 || hour > 23) {
      throw new Error(
        "compose: ctx.hour is required (0-23) when any provider has freshness:'per-hour'",
      );
    }
  }
}

// ─── Step 2: Resolve enabled blocks ──────────────────────────────────────────

type EnablementResult = {
  enabledBlocks: AnyBlockDefinition[];
  disabledBlocks: AnyBlockDefinition[];
};

async function resolveEnabled<P extends Record<string, ProviderDefinition<unknown>>>(
  options: ComposeOptions<P>,
  isEnabledRandom: () => number,
): Promise<EnablementResult> {
  const blocks = options.blocks.list() as AnyBlockDefinition[];
  if (options.isEnabled === undefined) {
    return { enabledBlocks: blocks.slice(), disabledBlocks: [] };
  }

  const enableCtx: ProviderContext = {
    date: options.date,
    hour: (options.ctx as { hour?: number } | undefined)?.hour,
    subjectId: (options.ctx as { subjectId?: string } | undefined)?.subjectId,
    random: isEnabledRandom,
    cache: { get: async () => undefined },
    userCtx: (options.ctx ?? {}) as Readonly<Record<string, unknown>>,
  };

  const verdicts = await Promise.all(
    blocks.map((b) => Promise.resolve(options.isEnabled?.(b, enableCtx))),
  );
  const enabledBlocks: AnyBlockDefinition[] = [];
  const disabledBlocks: AnyBlockDefinition[] = [];
  for (let i = 0; i < blocks.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: array index is within bounds from for loop
    (verdicts[i] ? enabledBlocks : disabledBlocks).push(blocks[i]!);
  }
  return { enabledBlocks, disabledBlocks };
}

// ─── Step 3: Compute requested providers ─────────────────────────────────────

/**
 * Compute the set of provider keys requested by the enabled blocks for this
 * compose() run. If `onlyTypes` is non-null, only blocks whose type is in
 * that list contribute their dependencies. Exported for testing.
 */
export function computeRequestedProviders(
  enabledBlocks: readonly AnyBlockDefinition[],
  onlyTypes: readonly string[] | null,
): ReadonlySet<string> {
  const requested = new Set<string>();
  for (const block of enabledBlocks) {
    if (onlyTypes !== null && !onlyTypes.includes(block.type)) continue;
    const deps = block.dependencies ?? [];
    for (const dep of deps) requested.add(dep);
  }
  return requested;
}

// ─── Step 4: Fetch providers ─────────────────────────────────────────────────

type FetchProvidersArgs<P extends Record<string, ProviderDefinition<unknown>>> = {
  providers: P;
  requestedKeys: ReadonlySet<string>;
  ctx: ProviderContext;
  cache: Cache;
  mode: "parallel-soft" | "parallel-hard";
  defaultTimeoutMs: number;
  providerTimeoutOverrides: Record<string, number>;
  requestedBlockTypes: readonly string[] | null;
};

type FetchProvidersResult = {
  outcomes: Record<string, ProviderOutcome>;
  providerData: Record<string, unknown>;
  hardAbort: boolean;
  hardAbortProvider?: string;
};

function effectiveTimeoutMs(
  provider: ProviderDefinition<unknown>,
  overrides: Record<string, number>,
  defaultMs: number,
): number {
  // biome-ignore lint/style/noNonNullAssertion: just checked !== undefined
  if (overrides[provider.key] !== undefined) return overrides[provider.key]!;
  if (provider.timeoutMs !== undefined) return provider.timeoutMs;
  return defaultMs;
}

/**
 * Fetch all requested providers in parallel. Handles cache lookup, timeout
 * enforcement, programmer-error re-throwing, and parallel-hard mode abort
 * detection. Exported for testing.
 */
export async function fetchProviders<P extends Record<string, ProviderDefinition<unknown>>>(
  args: FetchProvidersArgs<P>,
): Promise<FetchProvidersResult> {
  const entries = Array.from(args.requestedKeys)
    .map((key) => [key, args.providers[key]] as const)
    .filter(([, p]) => p !== undefined) as Array<readonly [string, ProviderDefinition<unknown>]>;

  const results = await Promise.all(
    entries.map(async ([key, provider]) => {
      const cacheKey = deriveCacheKey(provider, args.ctx);
      let cacheHit = false;

      if (cacheKey !== null) {
        const hit = await args.cache.get(cacheKey);
        if (hit !== undefined) {
          cacheHit = true;
          return [key, { ok: "data" as const, value: hit }, cacheHit, 0] as const;
        }
      }

      const started = Date.now();
      const timeoutMs = effectiveTimeoutMs(
        provider,
        args.providerTimeoutOverrides,
        args.defaultTimeoutMs,
      );

      let result: ProviderResult<unknown>;
      try {
        result = await withTimeout(
          provider.fetch(args.ctx, args.requestedBlockTypes),
          timeoutMs,
          `provider:${key}`,
        );
      } catch (thrown) {
        if (isProgrammerError(thrown)) {
          throw thrown; // propagate past compose() to caller
        }
        result = { ok: "error", reason: toSerializableError(thrown as Error) };
      }

      if (result.ok === "data" && cacheKey !== null) {
        await args.cache.set(cacheKey, result.value);
      }

      const durationMs = Date.now() - started;
      return [key, result, cacheHit, durationMs] as const;
    }),
  );

  const outcomes: Record<string, ProviderOutcome> = {};
  const providerData: Record<string, unknown> = {};
  let hardAbort = false;
  let hardAbortProvider: string | undefined;

  for (const [key, result, cacheHit, durationMs] of results) {
    outcomes[key] = {
      key,
      ok: result.ok,
      durationMs,
      cacheHit,
      reason: result.ok === "error" ? result.reason : undefined,
    };
    if (result.ok === "data") providerData[key] = result.value;
    if (result.ok === "error" && args.mode === "parallel-hard" && !hardAbort) {
      hardAbort = true;
      hardAbortProvider = key;
    }
  }

  return { outcomes, providerData, hardAbort, hardAbortProvider };
}

// ─── Step 5: Render enabled blocks ───────────────────────────────────────────

type RenderArgs = {
  enabledBlocks: readonly AnyBlockDefinition[];
  providerData: Record<string, unknown>;
  providerOutcomes: Record<string, ProviderOutcome>;
  hardAbort: boolean;
  hardAbortProvider?: string;
  ctx: ProviderContext;
};

type RenderCounters = {
  okCount: number;
  failCount: number;
  suppressedCount: number;
  renderFailCount: number;
};

type RenderResult = {
  slots: Slot[];
  failedBlocks: FailedBlock[];
  counters: RenderCounters;
};

/**
 * Route each enabled block to a Slot or FailedBlock based on provider outcomes.
 * Handles hard-abort mode, suppressed providers, errored providers, and render-phase
 * throws. Exported for testing.
 */
export function renderEnabledBlocks(args: RenderArgs): RenderResult {
  const slots: Slot[] = [];
  const failedBlocks: FailedBlock[] = [];
  const counters: RenderCounters = {
    okCount: 0,
    failCount: 0,
    suppressedCount: 0,
    renderFailCount: 0,
  };

  if (args.hardAbort) {
    args.enabledBlocks.forEach((block, index) => {
      failedBlocks.push({
        index,
        blockType: block.type,
        reason: {
          name: "HardModeAbort",
          message: `parallel-hard mode aborted due to provider '${args.hardAbortProvider}' error`,
        },
        failedProvider: args.hardAbortProvider,
      });
      counters.failCount++;
    });
    return { slots, failedBlocks, counters };
  }

  args.enabledBlocks.forEach((block, index) => {
    const deps = block.dependencies ?? [];
    const erroredDep = deps.find((d) => args.providerOutcomes[d]?.ok === "error");
    if (erroredDep !== undefined) {
      const erroredOutcome = args.providerOutcomes[erroredDep];
      failedBlocks.push({
        index,
        blockType: block.type,
        reason: erroredOutcome?.reason ?? {
          name: "ProviderError",
          message: `Provider '${erroredDep}' failed without a serialized reason`,
        },
        failedProvider: erroredDep,
      });
      counters.failCount++;
      return;
    }
    const suppressedDep = deps.find((d) => args.providerOutcomes[d]?.ok === "suppressed");
    if (suppressedDep !== undefined) {
      counters.suppressedCount++;
      return;
    }

    // Construct the block's data from provider results.
    let data: unknown = {};
    if (deps.length === 1) {
      // biome-ignore lint/style/noNonNullAssertion: just checked deps.length === 1
      data = args.providerData[deps[0]!];
    } else if (deps.length > 1) {
      const obj: Record<string, unknown> = {};
      for (const d of deps) obj[d] = args.providerData[d];
      data = obj;
    }

    try {
      // Invoke render to surface any render-phase throws as renderFailCount.
      // We do not use the JSX output here; render-to-bitmap is handled later by
      // src/render.tsx with the complete Composition.
      const renderCtx: RenderContext = {
        block: { type: block.type, id: `${block.type}-${index}`, data },
        composition: {
          id: "render-probe",
          version: 1,
          date: args.ctx.date,
          status: "ready",
          slots: [],
          failedBlocks: [],
          providerOutcomes: args.providerOutcomes,
          timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
        },
        logger: noopLogger,
        theme: SHELL_DEFAULTS,
        fontRoles: {},
        // Nominal content width (thermal-80 paper 576px minus 2×24px shell
        // padding). This probe only runs render to surface render-phase throws
        // and discards the JSX, so the exact value is immaterial — the real
        // width is applied later by render(). NOTE: width-dependent render
        // failures are therefore NOT caught here; they surface at render() time
        // with the caller's actual paper width. See compose() @remarks.
        contentWidth: 576 - 48,
        dpi: 203,
      };
      block.render({ data, ctx: renderCtx });
      slots.push({ index, blockType: block.type, data });
      counters.okCount++;
    } catch (thrown) {
      const reason =
        thrown instanceof Error
          ? toSerializableError(thrown)
          : { name: "NonErrorThrow", message: String(thrown) };
      failedBlocks.push({ index, blockType: block.type, reason });
      counters.renderFailCount++;
    }
  });

  return { slots, failedBlocks, counters };
}

// ─── Step 6: Retain previous slots (M4) ──────────────────────────────────────

type RetainArgs = {
  currentBlocks: readonly AnyBlockDefinition[];
  justRenderedSlots: readonly Slot[];
  onlyTypes: readonly string[] | null;
  previousComposition: Composition | undefined;
};

/**
 * Merge freshly-rendered slots with retained slots from a previous Composition.
 * Only active when `onlyTypes` is non-null (partial re-render). Retention is by
 * blockType (not ordinal index) to survive registry reorderings (M4). Exported for testing.
 */
export function retainPreviousSlots(args: RetainArgs): Slot[] {
  if (args.onlyTypes === null || args.previousComposition === undefined) {
    return [...args.justRenderedSlots];
  }
  const rendered = new Map(args.justRenderedSlots.map((s) => [s.blockType, s]));
  const previousByType = new Map(args.previousComposition.slots.map((s) => [s.blockType, s]));

  const out: Slot[] = [];
  args.currentBlocks.forEach((block, index) => {
    if (args.onlyTypes?.includes(block.type)) {
      const newSlot = rendered.get(block.type);
      if (newSlot !== undefined) {
        // Override index to reflect current registry position
        out.push({ ...newSlot, index });
      }
      return;
    }
    const prev = previousByType.get(block.type);
    if (prev !== undefined) {
      out.push({ ...prev, index }); // re-index by current position
    }
  });
  return out;
}

// ─── compose() — the 8-step pipeline ─────────────────────────────────────────

/**
 * Run the 8-step orchestrator pipeline and return a Composition.
 *
 * Steps: (1) validate inputs, (2) resolve enabled blocks, (3) compute
 * requested providers, (4) fetch providers in parallel, (5) render enabled
 * blocks, (6) retain previous slots for partial re-renders (M4), (7) compute
 * status via the truth table, (8) assemble the Composition envelope.
 *
 * Operational failures (provider errors, timeouts, render throws) are captured
 * inside the returned `Composition`. Only programmer errors (invalid options,
 * invariant violations) propagate out of `compose()`.
 *
 * @param options - Providers, blocks registry, date, context, cache, and policy options.
 * @returns A JSON-serializable `Composition` with slots, status, timing, and diagnostics.
 * @remarks
 * The render-phase probe runs each block at a NOMINAL content width (thermal-80
 * paper). Width-dependent render failures are therefore NOT surfaced by
 * `compose()`; they appear only when `render()` runs with the caller's actual
 * paper width. An empty `failedBlocks` from `compose()` does not guarantee a
 * width-sensitive block will render without error at every paper size.
 * @example
 * ```ts
 * import { compose, createRegistry, builtinBlocks, createProviderRegistry } from "pressedslip";
 *
 * const registry = createRegistry(builtinBlocks);
 * const providers = createProviderRegistry({});
 * const composition = await compose({ providers, blocks: registry, date: "2026-01-15" });
 * console.log(composition.status); // "ready"
 * ```
 */
export async function compose<P extends Record<string, ProviderDefinition<unknown>>>(
  options: ComposeOptions<P>,
): Promise<Composition> {
  const t0 = Date.now();
  validateInputs(options);

  const subjectId = (options.ctx as { subjectId?: string } | undefined)?.subjectId ?? "";
  // Three phase-scoped PRNGs (spec §7, codex peer-review C4). A single shared
  // PRNG would entangle the random sequences across phases: e.g., if isEnabled
  // consumes one random() during enablement, every subsequent random() in
  // fetch/render shifts by one. That makes the output sensitive to enablement
  // logic. Distinct PRNGs per phase keep each phase's sequence stable under
  // unrelated changes elsewhere.
  const baseSeed = fnv1a32(`${options.date}:${subjectId}`);
  const isEnabledRandom = mulberry32(fnv1a32(`${baseSeed}:isEnabled`));
  const fetchRandom = mulberry32(fnv1a32(`${baseSeed}:fetch`));
  const renderRandom = mulberry32(fnv1a32(`${baseSeed}:render`));

  const cache = options.cache ?? createMemoryCache();

  const { enabledBlocks } = await resolveEnabled(options, isEnabledRandom);
  const onlyTypes = options.onlyTypes ?? null;
  const requestedKeys = computeRequestedProviders(enabledBlocks, onlyTypes);
  const requestedBlockTypes = onlyTypes;

  const fetchCtx: ProviderContext = {
    date: options.date,
    hour: (options.ctx as { hour?: number } | undefined)?.hour,
    subjectId: (options.ctx as { subjectId?: string } | undefined)?.subjectId,
    random: fetchRandom,
    cache: { get: cache.get.bind(cache) },
    userCtx: (options.ctx ?? {}) as Readonly<Record<string, unknown>>,
  };

  const fetchStart = Date.now();
  const fetchResult = await fetchProviders({
    providers: options.providers,
    requestedKeys,
    ctx: fetchCtx,
    cache,
    mode: options.mode ?? "parallel-soft",
    defaultTimeoutMs: options.defaultProviderTimeoutMs ?? 5000,
    providerTimeoutOverrides: options.providerTimeouts ?? {},
    requestedBlockTypes,
  });
  const fetchPhaseMs = Date.now() - fetchStart;

  const renderCtx: ProviderContext = { ...fetchCtx, random: renderRandom };

  const renderStart = Date.now();
  const renderResult = renderEnabledBlocks({
    enabledBlocks,
    providerData: fetchResult.providerData,
    providerOutcomes: fetchResult.outcomes,
    hardAbort: fetchResult.hardAbort,
    hardAbortProvider: fetchResult.hardAbortProvider,
    ctx: renderCtx,
  });
  const renderPhaseMs = Date.now() - renderStart;

  const finalSlots = retainPreviousSlots({
    currentBlocks: enabledBlocks,
    justRenderedSlots: renderResult.slots,
    onlyTypes,
    previousComposition: options.previousComposition,
  });

  const enabledCount = enabledBlocks.length;
  const providerErrorCount = Object.values(fetchResult.outcomes).filter(
    (o) => o.ok === "error",
  ).length;
  const status = _computeStatus({
    enabledCount,
    okCount: renderResult.counters.okCount,
    failCount: renderResult.counters.failCount,
    suppressedCount: renderResult.counters.suppressedCount,
    renderFailCount: renderResult.counters.renderFailCount,
    providerErrorCount,
  });

  return {
    id: `composition-${options.date}-${subjectId || "shared"}`,
    version: 1,
    date: options.date,
    status,
    slots: finalSlots,
    failedBlocks: renderResult.failedBlocks,
    providerOutcomes: fetchResult.outcomes,
    timing: {
      totalMs: Date.now() - t0,
      fetchPhaseMs,
      renderPhaseMs,
    },
  };
}
