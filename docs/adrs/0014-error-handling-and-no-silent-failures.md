# ADR-0014: Error handling and no-silent-failures invariant

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo), validated by Codex peer-review (findings F2, F7)
- **Sub-project:** 1
- **Tags:** quality, api-surface, error-handling

## Context and problem statement

Silent failures are the #1 source of "but it ran clean!" production incidents in async pipelines. A renderer that swallows an unknown block type and returns a shorter-than-expected output gives the caller no signal that anything went wrong. By the time the consumer notices a block is missing, the call stack is gone. The question is not whether to record failures — recording is mandatory, unconditionally. The question is what *side effects* the library produces on failure: should it throw, warn, or silently continue? And how does the caller control that?

The reference implementation silently skipped unknown block types (marplanner audit finding L10). There was no way to know a block had been dropped unless you compared block counts manually.

## Decision drivers

- Silent failures destroy consumer trust in async libraries — they produce output that looks correct but isn't (ADR-0008 rule #2)
- Different consumers have different tolerance for render-time errors: a nightly-batch renderer wants `"skip"` to keep the queue moving; a development-time renderer wants `"throw"` to surface bugs immediately
- The failure record (`failedBlocks`) must be invariant — present and complete regardless of which error mode is chosen
- Peer-review finding F2: unknown-type drops must always land in `failedBlocks`, not only on `"throw"` mode
- Peer-review finding F7: schema validation (Zod `safeParse`) must happen in the render core before `block.render` is called; failures route through `onBlockError`

## Considered options

1. **Throw by default** — any unknown type or block error aborts the render; caller must handle all errors before calling `render()`
2. **Swallow by default** — unknown types and block errors are silently dropped; output may be shorter than expected with no signal
3. **Mode + always-record** — caller-controlled modes (`"skip" | "warn" | "throw"`) for side effects; `failedBlocks` is a required field on `Rendering` and is ALWAYS populated regardless of mode

## Decision outcome

**Chosen option: mode + always-record** — the failure record is the invariant; modes control side effects only. `onUnknownType` defaults to `"warn"` (log, record, continue); `onBlockError` defaults to `"skip"` (record, log, continue). `Rendering.failedBlocks` is a required field, typed `FailedBlock[]`, always present, empty when no failures occurred.

### Behavior table

| `onUnknownType` | Side effect | `failedBlocks` |
|---|---|---|
| `"skip"` | Nothing logged | ALWAYS recorded |
| `"warn"` (default) | `logger.warn(...)` | ALWAYS recorded |
| `"throw"` | Throws `Error` | ALWAYS recorded before throwing |

| `onBlockError` | Side effect | `failedBlocks` |
|---|---|---|
| `"skip"` (default) | `logger.error(...)` | ALWAYS recorded |
| `"placeholder"` | Visible placeholder cell (deferred to sp2) | ALWAYS recorded |
| `"throw"` | Throws the error | ALWAYS recorded before throwing |

### Schema validation placement

The render core calls `definition.schema.safeParse(block.data)` before invoking `definition.render`. On failure: a `FailedBlock` is recorded with `error: "Schema validation failed: ${parsed.error.message}"`; `onBlockError` policy applies. Block render functions receive pre-validated data — they do not call `schema.parse()` themselves.

### Positive consequences

- Callers always have a machine-readable failure record regardless of which mode they chose
- Development-time callers use `onUnknownType: "throw"` and see errors immediately
- Production-batch callers use the defaults (`"warn"` / `"skip"`) and receive partial output with a populated `failedBlocks` array for alerting
- Eliminates the "ran clean but blocks were dropped" class of incident

### Negative consequences / trade-offs

- `Rendering.failedBlocks` being required (not optional) means callers always receive the field even when it is empty; this is intentional — empty is safe, absent is not
- `onBlockError: "placeholder"` mode is specified but its visual implementation is deferred to sub-project 2 (the API shape is fixed; the rendering behavior is not)

## Links

- [ADR-0008: Quality bar — no silent failures rule](0008-quality-bar-never-rules.md)

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
