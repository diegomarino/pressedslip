# Replay Fixture Schema & Sanitization Checklist

Reference: spec §3 Decision 5 (the replay-harness design spec)

---

## File Naming Convention

Fixtures are named `NN-<slug>.json` where:

- `NN` is a zero-padded two-digit sequence number starting at `00`
- `<slug>` is a kebab-case description of what the fixture exercises
- Example: `09-full-briefing-all-six-shapes.json`

---

## Fixture Schema

Every fixture file must conform to the `ReplayFixture` interface defined in
`src/_internal/adapters/types.ts`. Top-level fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Matches the file slug (without `NN-` prefix) |
| `sourceMeta` | `FixtureSourceMeta` | yes | Provenance and sanitization descriptor |
| `input` | `BriefingEnvelopeV1` | yes | The sanitized briefing envelope to replay |
| `expected` | `ReplayFixtureExpected` | yes | Expected adapter output shape |
| `notes` | string | yes | Human-readable description of what this fixture exercises |

### `sourceMeta` fields

| Field | Type | Values |
|-------|------|--------|
| `sampledFrom` | string | Human-readable description; use `"synthetic — modeled after marplanner shape"` when not sampled from production DB |
| `sampledOn` | string | ISO date (`YYYY-MM-DD`) when the fixture was created |
| `sanitization` | string | Brief description of what was anonymized |
| `verifiedAgainst` | string | `"reference-code"` or `"marplanner-production"` |

**`verifiedAgainst` meaning:**

- `"reference-code"` — the fixture was created synthetically and verified against the reference implementation.
- `"marplanner-production"` — the fixture was sampled from a real marplanner production DB row (extra care: must pass full sanitization checklist before committing).

### `input` (`BriefingEnvelopeV1`) fields

| Field | Type | Notes |
|-------|------|-------|
| `version` | `1` | Always literal `1` in v1 |
| `date` | string | `YYYY-MM-DD`; anchored to `2024-01-01` in synthetic fixtures |
| `member` | `{ id, name }` | See sanitization checklist for `name` |
| `blocks` | array of `{ type, id, title, data }` | Registry order; `data` is block-type-specific |
| `sourceMeta` | optional | Must be empty or absent (see below) |

### `expected` fields

| Field | Type | Notes |
|-------|------|-------|
| `slotCount` | number | Expected number of rendered slots |
| `slotBlockTypes` | string[] | Ordered list of block types that succeeded |
| `failedBlockTypes` | string[] | Block types that failed (unknown type, schema error, etc.) |
| `briefingStatus` | `BriefingStatus` | `"ready"` / `"partial"` / `"failed"` / `"render-failed"` |
| `contentChecks` | optional array | Per-slot spot-checks (see below) |

### `contentChecks` path syntax

`contentChecks[].path` uses dot-notation into the slot's `data` field.

- `data.someField` — top-level field on `data`
- `data.groups.0.title` — array index access
- `data.groups.0.items.2.value` — nested array + field
- `blockType` — the slot's `blockType` field (not inside `data`)
- `title` — the slot's `title` field

The `contains` field is a substring; the linter checks `String(resolvedValue).includes(contains)`.

**Soft policy: include at least 1 `contentCheck` per fixture.** Fixtures with no
content checks still pass the linter but provide weaker replay guarantees.

---

## Sanitization Checklist

Apply before committing any fixture (required for `verifiedAgainst: "marplanner-production"`; recommended for synthetic):

| Data category | Replacement |
|---------------|-------------|
| Person names | `"Sample Name N"` (N = sequential integer per fixture) |
| Locations / city names | `"Sample City"` |
| Coordinates (lat/lon) | `40.4168, -3.7038` (fixed Madrid coordinates) |
| Calendar event titles | `"Sample Event N"` |
| Datetimes | Shift to anchor `2024-01-01T00:00:00Z`; preserve relative offsets |
| Email addresses | `"sample-N@example.com"` |
| URLs containing tokens/signatures | `"https://example.com/redacted"` |
| Quote / text content | Keep as-is if public-domain or generic |
| Anything else suspicious | `"REDACTED"` |

---

## `INPUT_SOURCE_META_ALLOWED_FIELDS`

Locked during initial fixture curation. Current value: **empty list (`[]`)**.

Rationale: marplanner's `payloadJson` carries no `sourceMeta` object at the
top level of the briefing envelope. Any `sourceMeta` key appearing in
`input.sourceMeta` of a replay fixture will be **rejected by the linter**
(fail-closed default). A future change extends this list when wiring in
the production adapter.

---

## Coverage Policy

Across the full fixture set, every block type from `src/blocks/` must
appear in at least one fixture's `input.blocks`:

| Block type | Fixture(s) |
|------------|-----------|
| `text-cell` | 00, 09, 13 |
| `kpi` | 01, 07, 09 |
| `list` | 02, 06, 07, 08, 09, 11, 12 |
| `key-value` | 03, 08, 09 |
| `qa-pair` | 04, 09, 14 |
| `quotation` | 05, 09 |

At least one fixture exercises `failedBlockTypes`: fixture **10** (unknown block type → partial status).

---

## Adding New Fixtures

1. Pick the next available `NN` sequence number.
2. Apply the sanitization checklist above.
3. Set `verifiedAgainst` to `"reference-code"` unless you sampled from a real DB row.
4. Include at least one `contentCheck`.
5. Update the coverage table above if a new block type is introduced.
