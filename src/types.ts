/**
 * @fileoverview Public type surface for the render-core package: exported types covering composition, blocks, registry, render pipeline, and paper geometry.
 */
import type { ReactElement } from "react";
import type { ZodType } from "zod";
import type { SerializableError as _SerializableError } from "./orchestrator/serializable-error.js";

// Re-export SerializableError so consumers can import it from this module.
// The canonical definition lives in src/orchestrator/serializable-error.ts
// to keep it co-located with toSerializableError() and isProgrammerError().
export type { SerializableError } from "./orchestrator/serializable-error.js";

/**
 * Five-state briefing status machine. `'pending'` is a consumer-set state on
 * reservation rows BEFORE compose() runs — compose() itself never returns it.
 */
export type BriefingStatus = "pending" | "ready" | "partial" | "failed" | "render-failed";

/**
 * Output of `compose()`. Carries the orchestration outcome (slots, status),
 * diagnostics (failedBlocks, providerOutcomes, timing), and consumer-friendly
 * identity fields (id, date, subject, meta). JSON-serializable by contract.
 */
export type Composition = {
  /** Stable composition identity. Used for React keys and persistence. */
  id: string;
  /** Envelope schema version. Bump on breaking envelope shape changes. */
  version: number;
  /**
   * Freeform string with temporal connotation. Conventionally "YYYY-MM-DD"
   * but unconstrained — "2026-W20", "2026-05-19-MORNING" both valid.
   */
  date: string;
  /** Briefing-level status. */
  status: BriefingStatus;
  /**
   * Rendered slots in registry order. Each slot is an orchestrator output
   * carrying block type, data, and optional title.
   */
  slots: readonly Slot[];
  /** Blocks that failed during provider fetch or render. */
  failedBlocks: readonly FailedBlock[];
  /** One outcome record per fetched provider, keyed by provider key. */
  providerOutcomes: Readonly<Record<string, ProviderOutcome>>;
  /** Timing breakdown for diagnostic and SLO purposes. */
  timing: TimingInfo;
  /** Optional subject context; displayed in ShellTop when present. */
  subject?: Subject;
  /** ISO-8601 timestamp; informational. */
  generatedAt?: string;
  /** Open metadata bag for consumer-specific data. */
  meta?: Record<string, unknown>;
};

/**
 * A `Composition` for `render()` input: the diagnostic fields (`failedBlocks`,
 * `providerOutcomes`, `timing`) are optional because they are `compose()`
 * outputs that `render()` never reads — hand-built compositions (e.g. parsed
 * from JSON) should not have to stub them. `render()` normalizes absent
 * fields to empty values before they reach block renderers via RenderContext.
 *
 * Every `Composition` is assignable to `CompositionInput`, so `compose()`
 * results pass through unchanged.
 */
export type CompositionInput = Omit<Composition, "failedBlocks" | "providerOutcomes" | "timing"> &
  Partial<Pick<Composition, "failedBlocks" | "providerOutcomes" | "timing">>;

/**
 * A single rendered slot in a Composition. JSON-serializable by contract.
 * `index` is the block's registry-position at compose time.
 * `title` is an optional display title carried through from compose; the
 * render-shell uses it when present. Stays in Slot (not derived elsewhere)
 * to keep Composition self-contained for replay.
 */
export type Slot = {
  /** Zero-based position in the registry at compose time. */
  readonly index: number;
  /** Dispatch key matching a BlockDefinition in the registry. */
  readonly blockType: string;
  /** Block-specific payload validated against the block's schema. */
  readonly data: unknown;
  /** Optional display title carried through from compose; render-shell uses
   * this when present. Stays in Slot (not derived elsewhere) to keep
   * Composition self-contained for replay. */
  readonly title?: string;
};

/**
 * Diagnostic record for a block that did not produce a slot.
 * JSON-serializable by contract.
 */
export type FailedBlock = {
  /** Zero-based registry position of the block that failed. */
  readonly index: number;
  /** Dispatch key of the block that failed. */
  readonly blockType: string;
  /** Serializable projection of the thrown error. */
  readonly reason: _SerializableError;
  /** When the failure was due to a provider returning {ok:'error'}, the
   * provider key. Absent for render-phase failures or hard-mode aborts where
   * the originating provider is not single-valued. */
  readonly failedProvider?: string;
};

/**
 * Diagnostic record for one provider's outcome during a compose() run.
 */
export type ProviderOutcome = {
  /** Provider key matching ProviderDefinition.key. */
  readonly key: string;
  /** Terminal outcome: 'data' = successful fetch, 'suppressed' = provider returned suppressed, 'error' = fetch threw or returned error. */
  readonly ok: "data" | "suppressed" | "error";
  /** Serializable error present when ok === 'error'. */
  readonly reason?: _SerializableError;
  /** Wall-clock ms from fetch start to resolution. */
  readonly durationMs: number;
  /** True when the result was served from cache without a network fetch. */
  readonly cacheHit: boolean;
};

/**
 * Timing breakdown for a compose() run. All values are wall-clock ms.
 */
export type TimingInfo = {
  /** Total wall-clock duration of the compose() run in milliseconds. */
  readonly totalMs: number;
  /** Wall-clock duration of the parallel provider-fetch phase in milliseconds. */
  readonly fetchPhaseMs: number;
  /** Wall-clock duration of the tree-render phase in milliseconds. */
  readonly renderPhaseMs: number;
};

/**
 * Optional subject context for a composition — typically a person, team, or entity
 * the briefing is generated for. Displayed in ShellTop when present.
 */
export type Subject = {
  /** Stable identifier for the subject, used as a cache-key component by personal providers. */
  id: string;
  /** Human-readable display name, rendered by ShellTop when subject is set. */
  name: string;
};

/**
 * Minimal structural input shape accepted by `composeJsoncWithHints()`. Both
 * the playground's `DraftComposition` and the package's full `Composition`
 * are structurally assignable to this type — the helper requires only the
 * fields that emit to JSONC.
 *
 * Round-trip invariant: `parseJsonc(composeJsoncWithHints(c, r))` yields a
 * value structurally equal to `c` PROVIDED all values within `meta` and
 * `slots[].data` are JSON-serializable (no `undefined` array entries, no
 * `BigInt`, no functions, no Symbols). `undefined`-valued object properties
 * are dropped per `JSON.stringify` semantics.
 */
export type JsoncCompositionInput = {
  /** Temporal label for the composition, conventionally "YYYY-MM-DD". */
  date: string;
  /** Optional subject context emitted as a JSONC comment hint above the subject field. */
  subject?: Subject;
  /** Open metadata bag serialized into the JSONC envelope. */
  meta: Record<string, unknown>;
  /** Ordered list of block slots to serialize with per-block type hints. */
  slots: ReadonlyArray<{
    /** Dispatch key for the block type, used to look up hint annotations. */
    blockType: string;
    /** Block-specific payload serialized verbatim into the JSONC output. */
    data: unknown;
    /** Optional display title serialized into the JSONC slot envelope. */
    title?: string;
  }>;
};

/**
 * A single typed content unit used as render input. The `type` field dispatches
 * to a registered BlockDefinition; `data` is validated against its schema before render.
 * Block is the render-input shape; Slot is the compose-output shape.
 */
export type Block = {
  /** Dispatch key matching a BlockDefinition.type in the registry. */
  type: string;
  /** Stable per-render identity. Generated by the orchestrator or by
   *  the consumer at compose time. NOT generated by render(). */
  id: string;
  /** Default shell renders this above the block content when set. */
  title?: string;
  /** Validated against BlockDefinition.schema before block.render is called. */
  data: unknown;
};

/**
 * The raw spec object passed to `defineBlock`. Carries the type key, Zod schema,
 * render function, and optional shell options before being cast to BlockDefinition.
 */
export type BlockDefinitionSpec<TData> = {
  /** Unique dispatch key for this block type; must be stable across releases. */
  type: string;
  /** Zod schema used to validate block data before passing it to render(). */
  schema: ZodType<TData>;
  /** Function that receives validated data and render context, returns a React element. */
  render: (props: { data: TData; ctx: RenderContext }) => ReactElement | null;
  /** Optional shell display options controlling title visibility, separator style, and padding. */
  shell?: BlockShellOptions;
  /** Provider keys this block depends on. The orchestrator fetches these
   * providers before invoking render(). Undefined or empty array means the
   * block is zero-dependency and renders without provider data. */
  dependencies?: readonly string[];
  /**
   * Optional textual hints surfaced by `composeJsoncWithHints()` as `//`
   * comments above each slot of this block type in JSONC output. Each entry
   * MUST be a single line (no `\n` / `\r`); the helper normalizes newlines
   * to spaces as defense-in-depth, but block authors should keep entries
   * single-line. Convention:
   *   - `Required: \`field.path\`, \`other.field\`` for required fields
   *   - `Values of \`field\`: a|b|c` for enums
   *   - `Tip: free-form` for behavioral notes
   *   - `Docs: docs/blocks/<name>.md` as the last entry (repo-local pointer)
   */
  hints?: readonly string[];
};

/**
 * A fully-typed block definition registered in the Registry. Alias of BlockDefinitionSpec
 * with a default `TData = unknown` for unparameterised storage in the registry map.
 */
export type BlockDefinition<TData = unknown> = BlockDefinitionSpec<TData>;

/**
 * Visual configuration hints for the BlockShell wrapper. All fields are optional;
 * omitted fields fall back to the shell's defaults (title hidden, thin separator, normal padding).
 */
export type BlockShellOptions = {
  /** Whether to render the title strip above block content. Default false. */
  showTitle?: boolean;
  /** Separator line style below the title strip. Default 'thin'. */
  separator?: "thin" | "thick" | "none";
  /** Content area padding preset. Default 'normal'. */
  padding?: "compact" | "normal" | "loose";
};

/**
 * Immutable block-definition store with O(1) lookup by type key.
 * Created via `createRegistry(definitions)`; enforces type uniqueness at construction time.
 */
export type Registry = {
  /** Returns all registered block definitions in insertion order. */
  list(): ReadonlyArray<BlockDefinition>;
  /** Returns the block definition for the given type key, or undefined if not registered. */
  find(type: string): BlockDefinition | undefined;
  /** Returns true if a block definition with the given type key is registered. */
  has(type: string): boolean;
  /** Number of registered block definitions. */
  readonly size: number;
};

/**
 * The output of a successful `render()` call: a 1-bit PNG buffer plus dimensions
 * and any blocks that failed schema validation or threw during render.
 */
export type Rendering = {
  /** Raw 1-bit PNG bytes ready for ESC/POS encoding or file output. */
  bytes: Uint8Array;
  /** Pixel format identifier; always "png-1bit" for the current render pipeline. */
  format: "png-1bit";
  /** Output image width in pixels, equal to the resolved WidthSpec. */
  width: number;
  /** Output image height in pixels, determined by the rendered content. */
  height: number;
  /** ALWAYS present. Empty array when no failures. Unknown-type drops and
   *  block-render errors land here regardless of mode. */
  failedBlocks: FailedBlock[];
};

/**
 * Configuration for a single `render()` invocation. Only `registry` is required;
 * all other fields have documented defaults.
 * Supply `theme` (preferred) OR `fonts` (legacy). When both are provided,
 * `theme` wins for fonts; `fonts` is ignored.
 */
export type RenderOptions = {
  /** Block definition registry used to look up render functions by type. */
  registry: Registry;
  /** Legacy font list. Prefer `theme`. When `theme` is set,
   * the theme's resolved fonts are used and this field is ignored. */
  fonts?: LoadedFont[];
  /** Theme input: ThemeTemplate (lazy-loads fonts) or PreparedTheme (sync).
   * When provided, overrides `fonts`. Use explicit `_kind === "prepared"` discriminant
   * — do NOT duck-type or cast. */
  theme?: import("./themes/types.js").ThemeInput;
  /** Default: PAPER.thermal80 (576px, 72mm @ 203dpi). */
  width?: WidthSpec;
  /** Default: no-op logger (silent). */
  logger?: Logger;
  /** 0–255, default 128 (matches marplanner). */
  threshold?: number;
  /** Default "warn". Drops always recorded in failedBlocks regardless. */
  onUnknownType?: "skip" | "warn" | "throw";
  /** Default "skip". Failures always recorded in failedBlocks regardless. */
  onBlockError?: "skip" | "placeholder" | "throw";
};

/**
 * Immutable per-block render context injected by `composeTree` into every block's
 * `render` function. Carries the raw slot data, the enclosing composition, and the logger.
 */
export type RenderContext = {
  /** The specific block being rendered, including its type, id, and validated data. */
  block: Block;
  /** The enclosing composition, available for cross-slot context in renderer logic. */
  composition: Composition;
  /** Pass-through from composition.subject for convenience in renderers. */
  subject?: Subject;
  /** Per-subject per-block params populated by the orchestrator.
   *  ALWAYS undefined in render-only flow. */
  config?: unknown;
  /** Cross-block shared cache populated by the orchestrator.
   *  ALWAYS undefined in render-only flow. */
  cache?: ReadOnlyCache;
  /** Always set; defaults to no-op if RenderOptions.logger is omitted. */
  logger: Logger;
  /** Resolved shell theme. Always defined; falls back to SHELL_DEFAULTS when
   *  render() was called without a theme. Block authors can rely on
   *  `ctx.theme.textStyles.{body,emphasis,...}` being present. */
  theme: Required<import("./themes/types.js").ShellTheme>;
  /** Font-roles registry from PreparedTheme. Empty object when render() was
   *  called without a theme. Required by `applyTextStyle` for fontRole resolution. */
  fontRoles: Record<string, LoadedFont[]>;
  /** Usable content width in pixels available to this block's render output —
   *  the resolved paper width minus the shell's horizontal padding (both sides).
   *  Always present. Width-sensitive blocks (e.g. wordSearch) size against this;
   *  if the block adds its own inner padding, subtract that too. In the compose()
   *  render-probe this carries a nominal default, since that probe discards its
   *  output and the real width is applied later by render(). */
  contentWidth: number;
  /** Resolved output DPI (dots per inch). Lets blocks convert between pixels and
   *  physical millimeters: `px = mm × dpi / 25.4`. Derived from the width spec —
   *  an explicit mm-spec `dpi`, else a `PaperPreset.nativeDpi`, else 203 (the
   *  thermal-native fallback for a context-free pixel width). Always present. */
  dpi: number;
};

/**
 * Minimal structured-log interface. Implemented by `noopLogger` (silent) and
 * `createConsoleLogger()` (stdout). Consumers may supply any compatible object.
 */
export type Logger = {
  /** Log a debug-level message with optional structured fields. */
  debug(msg: string, fields?: Record<string, unknown>): void;
  /** Log an info-level message with optional structured fields. */
  info(msg: string, fields?: Record<string, unknown>): void;
  /** Log a warning-level message with optional structured fields. */
  warn(msg: string, fields?: Record<string, unknown>): void;
  /** Log an error-level message with optional structured fields. */
  error(msg: string, fields?: Record<string, unknown>): void;
};

/**
 * A font asset ready to be passed to Satori. Produced by `loadFontFromBuffer` or
 * `loadFontFromUrl`; the `data` field holds raw TTF/OTF bytes as a Uint8Array.
 */
export type LoadedFont = {
  /** CSS font-family name passed to Satori for font matching. */
  name: string;
  /** Raw TTF or OTF font bytes loaded via loadFontFromBuffer or loadFontFromUrl. */
  data: Uint8Array;
  /** CSS numeric font weight (e.g. 400 for normal, 700 for bold). */
  weight: number;
  /** CSS font style; "normal" or "italic". */
  style: "normal" | "italic";
};

/**
 * Width input for the render pipeline. Supply pixel-exact `px` or millimeter-based
 * `mm` (with optional `dpi`; defaults to 203 for thermal). Always rounded up to a
 * multiple of 8 before use.
 */
export type WidthSpec =
  | {
      /** Physical width in millimeters; converted to pixels at render time using dpi (default 203). */
      mm: number;
      /** DPI to use for mm→px conversion. Defaults to 203 (thermal printer native DPI). */
      dpi?: number;
    }
  | {
      /** Exact width in pixels; must be a multiple of 8. */
      px: number;
    };

/**
 * Named paper-size preset extending WidthSpec with informational metadata.
 * Thermal entries carry pixel-exact `px` at native DPI; ISO/Letter entries
 * carry millimeter-based `mm` converted at render time via `resolveWidth`.
 */
export type PaperPreset = WidthSpec & {
  /** Physical paper roll/sheet width in mm. INFORMATIONAL ONLY. */
  paperWidthMm?: number;
  /**
   * Hardware-imposed margin per side in pixels, at the printer's native DPI.
   * INFORMATIONAL ONLY — the `px` field (or computed `mm→px` result) already
   * represents the *printable* area. Do NOT subtract from `px`.
   */
  edgeMarginPxPerSide?: number;
  /** Printer's native DPI (typically 203 for thermal). */
  nativeDpi?: number;
  /** Human-readable label for admin UIs. */
  description?: string;
};

/**
 * Read-only cache view exposed to providers via ProviderContext. Providers
 * MUST NOT mutate the shared cache; the orchestrator owns key derivation and
 * lifecycle.
 */
export type ReadOnlyCache = {
  /** Retrieve a cached value by key. Returns undefined if not present or expired. */
  get<T>(key: string): Promise<T | undefined>;
};

/**
 * Read/write cache interface used by the orchestrator and supplied by the
 * consumer via ComposeOptions.cache. Default in-memory implementation lives
 * for a single compose() run.
 */
export type Cache = ReadOnlyCache & {
  /** Store a value under key with an optional TTL in milliseconds. */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  /** Remove the entry for key from the cache. */
  delete(key: string): Promise<void>;
  /** Remove all entries from the cache. */
  clear(): Promise<void>;
};

/**
 * Consumer-defined per-compose context bag. Must carry `subjectId: string`
 * when any provider has scope:'personal', and `hour: number` when any provider
 * has freshness:'per-hour'. Consumers may augment via module declaration to
 * type their specific shape.
 */
export type ComposeContext = Record<string, unknown>;

/**
 * The provider context passed to every provider.fetch() call. Each pipeline
 * phase (enable, fetch, render) gets its own ProviderContext instance with
 * a phase-scoped random function.
 */
export type ProviderContext = {
  /** Composition date string, conventionally "YYYY-MM-DD", passed from ComposeOptions. */
  readonly date: string;
  /** Hour of day (0–23) when ComposeContext carries `hour`; undefined otherwise. */
  readonly hour?: number;
  /** Subject identifier when ComposeContext carries `subjectId`; undefined for shared providers. */
  readonly subjectId?: string;
  /** Phase-scoped deterministic random function (spec §7). Do not use Math.random() in providers. */
  readonly random: () => number;
  /** Read-only cache view; providers MUST NOT mutate the cache directly. */
  readonly cache: ReadOnlyCache;
  /** Full consumer context bag passed through from ComposeOptions.ctx. */
  readonly userCtx: Readonly<ComposeContext>;
};

/**
 * Discriminated union for provider fetch outcomes. The orchestrator wraps
 * thrown Errors and maps them to {ok:'error'} (with the programmer-error
 * escape hatch documented in the spec).
 */
export type ProviderResult<T> =
  | {
      /** Discriminant indicating a successful fetch. */
      ok: "data";
      /** Fetched provider value to supply to dependent blocks. */
      value: T;
    }
  | {
      /** Discriminant indicating the provider opted out for this run. */
      ok: "suppressed";
    }
  | {
      /** Discriminant indicating the fetch failed with an error. */
      ok: "error";
      /** Serializable projection of the thrown or returned error. */
      reason: _SerializableError;
    };

/**
 * Definition of a single provider. Identified by key, scoped, and given a
 * freshness policy that determines cache invalidation.
 */
export type ProviderDefinition<T = unknown> = {
  /** Stable unique identifier used as cache-key prefix and in providerOutcomes. */
  readonly key: string;
  /** Data sharing scope: 'shared' for global data, 'personal' for per-subject data. */
  readonly scope: "shared" | "personal";
  /** Cache invalidation policy determining how long fetched data remains valid. */
  readonly freshness: "per-day" | "per-hour" | "never" | "always-fetch";
  /** Per-provider fetch timeout in milliseconds. Overrides ComposeOptions.defaultProviderTimeoutMs. */
  readonly timeoutMs?: number;
  /** Fetch the provider's data for the current context. Returns a ProviderResult discriminated union. */
  fetch(
    ctx: ProviderContext,
    requestedBlockTypes: readonly string[] | null,
  ): Promise<ProviderResult<T>>;
};

/**
 * Options to `compose()`. Validated at compose entry; programmer errors throw
 * before any side effects.
 */
export type ComposeOptions<
  P extends Record<string, ProviderDefinition<unknown>> = Record<
    string,
    ProviderDefinition<unknown>
  >,
> = {
  /** Map of provider definitions to fetch during compose; keys become providerOutcomes keys. */
  providers: P;
  /** Block registry supplying the ordered set of block definitions to compose. */
  blocks: Registry;
  /** Composition date string, conventionally "YYYY-MM-DD"; forwarded to all providers. */
  date: string;
  /** Consumer-defined context bag forwarded to providers; supply subjectId for personal scope. */
  ctx?: ComposeContext;
  /** Provider execution mode: 'parallel-soft' returns partial on error, 'parallel-hard' aborts on first error. */
  mode?: "parallel-soft" | "parallel-hard";
  /** Optional per-block enable predicate; returning false skips the block without recording a failure. */
  isEnabled?: (block: AnyBlockDefinition, ctx: ProviderContext) => boolean | Promise<boolean>;
  /** Read/write cache implementation; defaults to in-memory per-run cache. */
  cache?: Cache;
  /** Fallback fetch timeout in ms applied to any provider without its own timeoutMs. */
  defaultProviderTimeoutMs?: number;
  /** Per-provider overrides for fetch timeout in ms, keyed by provider key. */
  providerTimeouts?: Record<string, number>;
  /** When set, restricts compose to only blocks whose type is in this list. */
  onlyTypes?: readonly string[];
  /** Previous composition to use for cache warm-start or incremental compose. */
  previousComposition?: Composition;
};

// biome-ignore-start lint/suspicious/noExplicitAny: intentional existential type for heterogeneous block registries
/**
 * Existential block-definition type for registries and aggregates that hold
 * blocks with heterogeneous `TData`. `BlockDefinition<TData>` is invariant in
 * `TData` (covariant via `schema`, contravariant via `render`), so mixed arrays
 * are not assignable to `BlockDefinition<unknown>[]`. Use `AnyBlockDefinition`
 * as the array element type when assembling such collections; the registry
 * never exposes `TData` back to consumers, so the `any` does not leak.
 *
 * The `any` here is an intentional existential escape hatch, not a lazy
 * shortcut. `unknown` does not resolve the invariance; only `any` does.
 */
export type AnyBlockDefinition = BlockDefinition<any>;
// biome-ignore-end lint/suspicious/noExplicitAny: intentional existential type for heterogeneous block registries
