/**
 * @fileoverview Internal types for the replay harness adapter scaffold.
 * NOT exported via package.json exports. Importable only from tests.
 *
 * Marplanner shape derivation notes (from fixture curation):
 * - payloadJson top-level: { version: 1, member: { id, name }, date, blocks }
 * - blocks: BlockEnvelope[] = { type, id, title, data }
 * - No subjects array (marplanner is single-member-per-envelope; member is a
 *   single object, not an array). Adapted to a `member` field here.
 * - No per-block config in payloadJson (config lives in memberBlockSettings DB
 *   table, not the envelope). BriefingEnvelopeV1.blocks omits config.
 * - No sourceMeta in marplanner's payloadJson. INPUT_SOURCE_META_ALLOWED_FIELDS
 *   is empty → linter fails-closed on any sourceMeta in replay fixtures.
 */

import type { BriefingStatus } from "../../types.js";

/**
 * Bounded set of allowed top-level fields inside `input.sourceMeta` (envelope-
 * side; distinct from fixture-level `sourceMeta` which has its own schema).
 * Currently empty; fixtures with unknown fields fail the linter (fail-closed default).
 *
 * Marplanner's payloadJson carries no sourceMeta. Any sourceMeta usage
 * in replay fixtures will be rejected by the linter.
 */
export const INPUT_SOURCE_META_ALLOWED_FIELDS: readonly string[] = [] as const;

/**
 * Allowed fields in the input sourceMeta envelope. Currently empty (fail-closed default).
 */
export type InputSourceMetaField = (typeof INPUT_SOURCE_META_ALLOWED_FIELDS)[number];

/**
 * Envelope member shape — a single person or entity the briefing is for.
 * Maps to marplanner's `BriefingMember { id, name }`.
 */
export interface EnvelopeMember {
  readonly id: string;
  readonly name: string;
}

/**
 * Sanitized BriefingEnvelope shape (replay-side). Shape derived from marplanner
 * payloadJson during fixture curation.
 *
 * Design notes:
 * - No `subjects` array: marplanner uses a single `member` object (personal
 *   briefing model). Adapted to `member` field here.
 * - No per-block `config`: config is in a separate DB table in marplanner;
 *   the persisted payloadJson has only { type, id, title, data }.
 * - Schema version: always 1 (matches marplanner).
 * - No `sourceMeta` on envelopes in marplanner production data.
 */
export interface BriefingEnvelopeV1 {
  /** Schema version — always 1 in v1 (matches marplanner). */
  readonly version: 1;
  /** Date the briefing covers; "YYYY-MM-DD" by convention. */
  readonly date: string;
  /** The member (person/entity) this briefing belongs to. */
  readonly member: EnvelopeMember;
  /** Block descriptors in registry order. */
  readonly blocks: ReadonlyArray<{
    /** Block type identifier (e.g. "weather", "today"). */
    readonly type: string;
    /** Stable block id (receipt-style, e.g. "MES-8B4F6B"). */
    readonly id: string;
    /** Human-readable block title. */
    readonly title: string;
    /** Block payload; shape is block-type-specific. */
    readonly data: unknown;
  }>;
  /** Bounded metadata bag. Fields must be inside INPUT_SOURCE_META_ALLOWED_FIELDS. */
  readonly sourceMeta?: Readonly<Partial<Record<InputSourceMetaField, unknown>>>;
}

/** Fixture-level metadata describing provenance + sanitization. */
export interface FixtureSourceMeta {
  readonly sampledFrom: string;
  readonly sampledOn: string;
  readonly sanitization: string;
  readonly verifiedAgainst: "reference-code" | "marplanner-production";
}

/**
 * A structural assertion on a single Composition slot (part of ReplayFixtureExpected).
 */
export interface ContentCheck {
  readonly slotIndex: number;
  readonly path: string;
  readonly contains: string;
}

/**
 * Expected output properties for a replay fixture assertion.
 */
export interface ReplayFixtureExpected {
  readonly slotCount: number;
  readonly slotBlockTypes: readonly string[];
  readonly failedBlockTypes: readonly string[];
  readonly briefingStatus: BriefingStatus;
  readonly contentChecks?: readonly ContentCheck[];
}

/**
 * A replay harness fixture: a stored marplanner briefing envelope + expected structural equivalence after adaptation.
 */
export interface ReplayFixture {
  readonly name: string;
  readonly sourceMeta: FixtureSourceMeta;
  readonly input: BriefingEnvelopeV1;
  readonly expected: ReplayFixtureExpected;
  readonly notes: string;
}
