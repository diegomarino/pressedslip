# Wiring async data into a composition

Providers fetch async data for your blocks. When you call `compose()`, the orchestrator runs all providers in parallel, caches results, handles timeouts, and skips blocks when their data sources fail.

This guide walks you through creating providers, registering them, and watching the orchestrator pull data in real time.

## What is a provider?

A provider is a function that returns data to a block. It has a key (like `"weather"`), a scope (`"shared"` or `"personal"`), a cache policy, and a `fetch()` method.

```ts
import { defineProvider } from "pressedslip/providers";

const myProvider = defineProvider({
  key: "greeting",
  scope: "shared",
  freshness: "per-day",
  async fetch(ctx) {
    return { ok: "data", value: "Good morning!" };
  },
});
```

The fetch method always returns a `ProviderResult<T>`:

- `{ ok: "data", value: T }` — Success. The orchestrator caches this and passes it to blocks.
- `{ ok: "suppressed" }` — No data available (e.g., empty pool, unavailable condition). Blocks with this dependency are skipped.
- `{ ok: "error", reason: SerializableError }` — A runtime error occurred. The block is marked failed and `reason` holds details.

## Built-in providers

The package includes two reference providers for common patterns.

### Static text provider

Always returns a fixed value. Use this for testing or static blocks:

```ts
import { createStaticTextProvider } from "pressedslip/providers";

const headerProvider = createStaticTextProvider({
  key: "header",
  value: "Daily Briefing — May 24, 2026",
});

const result = await headerProvider.fetch(ctx);
// { ok: "data", value: "Daily Briefing — May 24, 2026" }
```

### Fixture pool provider

Picks one element from a list deterministically using the random context:

```ts
import { createFixturePoolProvider } from "pressedslip/providers";

const quotesProvider = createFixturePoolProvider({
  key: "quote",
  pool: [
    "The only way to do great work is to love what you do.",
    "Innovation distinguishes between a leader and a follower.",
    "Life is what happens when you're busy making other plans.",
  ],
  scope: "shared",
  freshness: "per-day",
});

const result = await quotesProvider.fetch(ctx);
// { ok: "data", value: "The only way to do great work is to love what you do." }
// (deterministic per date; different user = same index, different date = different index)
```

## Fetching from HTTP

To fetch real data (weather, news, stock prices), use your HTTP client inside the fetch method:

```ts
import { defineProvider } from "pressedslip/providers";

const weatherProvider = defineProvider({
  key: "weather",
  scope: "shared",
  freshness: "per-day",
  timeoutMs: 5000, // max 5 seconds; orchestrator aborts if exceeded
  async fetch(ctx) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m`
      );
      if (!res.ok) {
        return {
          ok: "error",
          reason: { name: "HttpError", message: `${res.status} ${res.statusText}` },
        };
      }
      const data = await res.json();
      return { ok: "data", value: { temp: data.current.temperature_2m } };
    } catch (err) {
      return {
        ok: "error",
        reason: {
          name: err instanceof Error ? err.constructor.name : "FetchError",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
});
```

The orchestrator wraps your fetch call in a timeout; if it exceeds `timeoutMs`, the result becomes `{ ok: "error" }` automatically. No need to add your own timeout logic.

## Provider context

Each `fetch(ctx)` receives a context object:

```ts
type ProviderContext = {
  readonly date: string;              // "YYYY-MM-DD" from compose()
  readonly hour?: number;             // 0–23 if per-hour freshness is needed
  readonly subjectId?: string;        // user ID or request ID
  readonly random: () => number;      // deterministic PRNG (0–1) per fetch phase
  readonly cache: ReadOnlyCache;      // read-only cache.get(key)
  readonly userCtx: Readonly<Record<string, unknown>>; // custom app context
};
```

Use `random()` for deterministic selection (e.g., A/B tests, fixture pools):

```ts
const seed = defineProvider({
  key: "experiment",
  scope: "personal",
  freshness: "per-day",
  async fetch(ctx) {
    const roll = ctx.random(); // [0, 1)
    return {
      ok: "data",
      value: { variant: roll < 0.5 ? "control" : "treatment" },
    };
  },
});
```

The PRNG is seeded per date + subjectId, so the same user always gets the same variant on the same day.

## Registering providers

Create a registry and pass it to `compose()`:

```ts
import {
  createProviderRegistry,
  createStaticTextProvider,
} from "pressedslip/providers";

const providers = createProviderRegistry({
  greeting: createStaticTextProvider({
    key: "greeting",
    value: "Good morning!",
  }),
  quote: createFixturePoolProvider({
    key: "quote",
    pool: ["Quote A", "Quote B"],
  }),
});
```

The registry enforces two invariants:

1. Each registry key must match `provider.key`.
2. No two providers share the same key.

```ts
// ✗ This throws: key mismatch
const bad = createProviderRegistry({
  msg: createStaticTextProvider({ key: "greeting", value: "Hi" }),
});

// ✗ This throws: duplicate key
const bad2 = createProviderRegistry({
  greeting: createStaticTextProvider({ key: "greeting", value: "Hi" }),
  greeting2: createStaticTextProvider({ key: "greeting", value: "Hello" }),
});
```

## Wiring into a composition

Declare dependencies in your blocks, then pass the provider registry to `compose()`:

```ts
import {
  compose,
  createRegistry,
  builtinBlocks,
  createProviderRegistry,
  createStaticTextProvider,
} from "pressedslip";

const providers = createProviderRegistry({
  greeting: createStaticTextProvider({
    key: "greeting",
    value: "Welcome!",
  }),
});

const blocks = createRegistry(builtinBlocks);

const composition = await compose({
  providers,
  blocks,
  date: "2026-05-24",
  ctx: {
    subjectId: "user-123",
  },
});

console.log(composition.status); // "ready" if all blocks rendered
console.log(composition.slots);  // array of rendered blocks
```

A block declares its dependencies via the `dependencies` field:

```ts
import { defineBlock } from "pressedslip";

const statsBlock = defineBlock({
  type: "stats",
  dependencies: ["weather", "greeting"], // providers required for this block
  render(args) {
    const { weather, greeting } = args.data;
    return <div>{greeting}: {weather.temp}°C</div>;
  },
});
```

When `compose()` runs, it fetches `weather` and `greeting` in parallel, passes them to `statsBlock.render()`, and renders the block. If either provider fails, the block is skipped.

## Parallel fetching and caching

The orchestrator fetches all requested providers in parallel (not sequentially). Each provider has its own timeout:

```ts
const providers = createProviderRegistry({
  fast: defineProvider({
    key: "fast",
    scope: "shared",
    freshness: "per-day",
    timeoutMs: 1000,
    async fetch() {
      await new Promise((r) => setTimeout(r, 100));
      return { ok: "data", value: "quick" };
    },
  }),
  slow: defineProvider({
    key: "slow",
    scope: "shared",
    freshness: "per-day",
    timeoutMs: 10000,
    async fetch() {
      await new Promise((r) => setTimeout(r, 5000));
      return { ok: "data", value: "slow" };
    },
  }),
});

// Both run at the same time; total time ≈ 5 seconds, not 5.1
```

Caching works per provider key, keyed by scope + freshness + date (and hour if `per-hour`):

```ts
const composition1 = await compose({
  providers,
  blocks: registry,
  date: "2026-05-24",
  cache: myCache, // pass a cache instance
});

const composition2 = await compose({
  providers,
  blocks: registry,
  date: "2026-05-24", // same date
  cache: myCache,
});

// Second run finds all providers cached; no fetch calls made
```

## Failure modes

When a provider fails:

- **Fail-soft mode** (default): Blocks depending on the failed provider are skipped. Other blocks continue.
- **Hard-fail mode** (`mode: "parallel-hard"`): All blocks abort immediately. Use this if any provider failure invalidates the entire composition.

```ts
const composition = await compose({
  providers,
  blocks,
  date: "2026-05-24",
  mode: "parallel-soft", // default: one provider failure doesn't break others
});

if (composition.status !== "ready") {
  console.log("Some blocks failed:", composition.failedBlocks);
  console.log("Provider outcomes:", composition.providerOutcomes);
}
```

Each provider outcome captures timing and cache hit info:

```ts
{
  key: "weather",
  ok: "error",
  durationMs: 152,
  cacheHit: false,
  reason: { name: "TimeoutError", message: "..." },
}
```

## Scope and freshness

Two metadata fields control caching and context invariants:

- **`scope`**: `"shared"` (cached globally) or `"personal"` (cached per `subjectId`). If a provider is personal and you don't pass `ctx.subjectId` to `compose()`, it throws.
- **`freshness`**: `"per-day"`, `"per-hour"`, `"never"` (never cached), or `"always-fetch"` (always fetch, never return cached). If `per-hour`, you must pass `ctx.hour` (0–23).

```ts
const providerThatNeedsHour = defineProvider({
  key: "hourly-data",
  scope: "shared",
  freshness: "per-hour",
  async fetch(ctx) {
    // ctx.hour is guaranteed to be 0–23
    return { ok: "data", value: { hour: ctx.hour } };
  },
});

// ✗ This throws: hour is required
await compose({
  providers: createProviderRegistry({ hourly: providerThatNeedsHour }),
  blocks,
  date: "2026-05-24",
  // missing ctx.hour
});

// ✓ This works
await compose({
  providers: createProviderRegistry({ hourly: providerThatNeedsHour }),
  blocks,
  date: "2026-05-24",
  ctx: { hour: 14 },
});
```

## Monitoring and diagnostics

After `compose()` returns, inspect the composition:

```ts
const composition = await compose({
  providers,
  blocks,
  date: "2026-05-24",
});

console.log(composition.status);           // "ready" | "partial" | "empty" | "failed"
console.log(composition.providerOutcomes); // details of each fetch
console.log(composition.timing);           // { totalMs, fetchPhaseMs, renderPhaseMs }
console.log(composition.failedBlocks);     // { index, blockType, reason, failedProvider }
```

## See also

- [Architecture: Provider lifecycle](../architecture/provider.md) — Mermaid sequence diagram of fetch, cache, and timeout choreography.
- [API reference: ProviderDefinition](../api/) — full type signature and examples.
- [API reference: compose()](../api/) — orchestrator options including `defaultProviderTimeoutMs` and `providerTimeouts`.
