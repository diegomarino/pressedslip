# ADR-0010: Naming conventions — noun-only root types, verb functions

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 1
- **Tags:** api-surface, dx

## Context and problem statement

Naming is the load-bearing first signal of API intent. A library named for its source application dies with its source application — consumers read the names and infer the scope. If the root data type is `BriefingEnvelope`, the library is a briefing library. If it is `RenderManifest`, it is a render-infrastructure library. If it is `Composition`, it is a general-purpose document-assembly library that happens to produce printed output. The three names carry entirely different promises to a caller who has never read the source. This decision locks the naming convention before any code is written, so that it can never be renegotiated mid-implementation.

The context: marplanner's existing type was `BriefingEnvelope<T>`, with an `envelope.member` field that assumed single-tenant membership. Lifting that name into the library would silently encode both the source app's domain (`briefing`) and its data model (`member`).

## Decision drivers

- Noun-only root types are the convention in mature React-ecosystem libraries (react-pdf: `Document`, `Page`; ProseMirror: `Node`, `Schema`; Slate: `Editor`, `Element`; satori: `ReactNode`)
- A library named for its source app's domain signals narrow scope to every prospective consumer
- Verbs belong on functions, not types — `RenderManifest` implies the type itself renders, which is wrong
- The `compose` verb is reserved for sub-project 3's `compose(providers, options) → Composition` headline function; sub-project 1 must not colonise it

## Considered options

1. **`RenderEnvelope`** — noun + render domain; describes what it is (an envelope for render)
2. **`RenderManifest`** — noun + render domain; suggests a manifest of what to render
3. **`BriefingEnvelope`** — lifted from marplanner; noun + source-app domain
4. **`Composition`** — pure noun; makes no claim about render lifecycle or source domain

## Decision outcome

**Chosen option: `Composition`** — the root data type is `Composition`. It doesn't presume the render lifecycle (it is not a manifest or an envelope), doesn't encode the source application's domain (it is not a briefing), and pairs naturally with the companion verb `compose()` reserved for sub-project 3. All public types follow the same noun-only convention; all verbs are function names.

### Full naming table

| Concept | Name | Rationale |
|---|---|---|
| Root data type | `Composition` | Noun-only; no render-lifecycle or source-domain assumption |
| Per-block envelope | `Block` | Pure noun; `composition.blocks: Block[]` is unambiguous |
| Output type | `Rendering` | "The artifact produced by rendering" (cf. architectural rendering) |
| Optional subject | `Subject` | More generic than marplanner's `member`; minimal `{ id, name }` |
| Headline function | `render` | Top-level verb; output-format-neutral |
| Reserved verb | `compose` | Reserved for sub-project 3; not exported in sub-project 1 |
| Block factory | `defineBlock` | Typed factory; verb signals construction, not declaration |
| Registry factory | `createRegistry` | `create` prefix signals a new instance, not a singleton |

### Positive consequences

- API reads as a general-purpose document-assembly library, not as marplanner infrastructure
- Consumer type inference sees `Composition`, `Block`, `Rendering` — all portable nouns
- `compose` is safely reserved for sub-project 3 without naming collision

### Negative consequences / trade-offs

- `Composition` is slightly less self-evident to a print-domain engineer expecting `PrintJob` or `Document`; mitigated by JSDoc on the type
- Renaming marplanner's `BriefingEnvelope` fields (`member` → `subject`, etc.) requires a mapping in the sub-project 8 migration adapter

## Links

- [ADR-0011: Public API shape](0011-public-api-shape.md)
- Bounded-hybrid migration strategy (the strategy adopted during extraction from the source app)

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
