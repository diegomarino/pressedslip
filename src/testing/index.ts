/**
 * @module pressedslip/testing
 * @fileoverview Testing entrypoint for `pressedslip/testing`.
 *
 * Testing entrypoint: aggregated builtin fixtures and assertion helpers for
 * downstream playgrounds, regression tests, and dev tooling.
 *
 * NOT covered by semver for scenario-key names — additions and renames may
 * land in patch releases. Assertion helpers (assertBlockCount, assertBlockTypes,
 * assertNoFailedBlocks, assertStructurallyEqual) are stable public API.
 */
import { keyValueFixtures } from "../blocks/key-value.fixtures.js";
import type { KeyValueData } from "../blocks/key-value.js";
import { kpiFixtures } from "../blocks/kpi.fixtures.js";
import type { KpiData } from "../blocks/kpi.js";
import { listFixtures } from "../blocks/list.fixtures.js";
import type { ListData } from "../blocks/list.js";
import { qaPairFixtures } from "../blocks/qa-pair.fixtures.js";
import type { QaPairData } from "../blocks/qa-pair.js";
import { quotationFixtures } from "../blocks/quotation.fixtures.js";
import type { QuotationData } from "../blocks/quotation.js";
import { textCellFixtures } from "../blocks/text-cell.fixtures.js";
import type { TextCellData } from "../blocks/text-cell.js";
import { wordSearchFixtures } from "../blocks/word-search.fixtures.js";
import type { WordSearchData } from "../blocks/word-search.js";

/**
 * Aggregated fixture map keyed by block type. Each entry is a record of
 * scenario name → valid block data. Scenario keys are NOT covered by semver.
 *
 * @example
 * ```ts
 * import { builtinFixtures } from "pressedslip/testing";
 *
 * const data = builtinFixtures.textCell.basic;
 * ```
 */
export const builtinFixtures: {
  /** Fixture scenarios for the keyValue block. */
  keyValue: Record<string, KeyValueData>;
  /** Fixture scenarios for the kpi block. */
  kpi: Record<string, KpiData>;
  /** Fixture scenarios for the list block. */
  list: Record<string, ListData>;
  /** Fixture scenarios for the qaPair block. */
  qaPair: Record<string, QaPairData>;
  /** Fixture scenarios for the quotation block. */
  quotation: Record<string, QuotationData>;
  /** Fixture scenarios for the textCell block. */
  textCell: Record<string, TextCellData>;
  /** Fixture scenarios for the wordSearch block. */
  wordSearch: Record<string, WordSearchData>;
} = {
  keyValue: keyValueFixtures,
  kpi: kpiFixtures,
  list: listFixtures,
  qaPair: qaPairFixtures,
  quotation: quotationFixtures,
  textCell: textCellFixtures,
  wordSearch: wordSearchFixtures,
};

export { keyValueFixtures } from "../blocks/key-value.fixtures.js";
export { kpiFixtures } from "../blocks/kpi.fixtures.js";
export { listFixtures } from "../blocks/list.fixtures.js";
export { qaPairFixtures } from "../blocks/qa-pair.fixtures.js";
export { quotationFixtures } from "../blocks/quotation.fixtures.js";
export { textCellFixtures } from "../blocks/text-cell.fixtures.js";
export { wordSearchFixtures } from "../blocks/word-search.fixtures.js";

import { type CompareOptions, compareStructurally } from "./internal/compare-structurally.js";

/**
 * Minimal duck type accepted by block-count and block-type assertion helpers.
 * Matches both `Composition` (slots→blocks) and any test object with a `blocks`
 * array. Using a structural interface keeps the helpers decoupled from the
 * concrete `Rendering` type (which carries image bytes, not block lists).
 */
interface WithBlocks {
  blocks: ReadonlyArray<{ type: string }>;
}

/**
 * Minimal duck type accepted by `assertNoFailedBlocks`. Matches any object
 * that optionally carries a `failedBlocks` array (present in `Rendering` and
 * `Composition`).
 */
interface WithFailedBlocks {
  failedBlocks?: ReadonlyArray<unknown>;
}

/**
 * Asserts that a block-list-like object contains exactly the expected number
 * of blocks. This helper is for fixture/replay structures that expose
 * `blocks`; `Rendering` from `render()` exposes `failedBlocks`, not `blocks`.
 *
 * @param rendering - Any object with a `blocks` array.
 * @param expected - The expected block count.
 * @throws If `rendering.blocks.length !== expected`. Error message includes both counts.
 *
 * @example
 * ```ts
 * import { assertBlockCount } from "pressedslip/testing";
 *
 * const r = { blocks: [{ type: "textCell" }, { type: "kpi" }, { type: "list" }] };
 * assertBlockCount(r, 3);
 * ```
 */
export function assertBlockCount(rendering: WithBlocks, expected: number): void {
  const actual = rendering.blocks.length;
  if (actual !== expected) {
    throw new Error(`assertBlockCount: expected ${expected}, got ${actual}`);
  }
}

/**
 * Asserts that a block-list-like object's blocks have the expected types in
 * order. Use `assertNoFailedBlocks` for the `Rendering` object returned by
 * `render()`.
 *
 * @param rendering - Any object with a `blocks` array.
 * @param expectedTypes - The expected block-type strings, in order.
 * @throws If lengths differ OR any type at a given index differs. Error message includes the first divergence.
 *
 * @example
 * ```ts
 * import { assertBlockTypes } from "pressedslip/testing";
 *
 * assertBlockTypes(r, ["textCell", "kpi", "list"]);
 * ```
 */
export function assertBlockTypes(rendering: WithBlocks, expectedTypes: string[]): void {
  const actual = rendering.blocks.map((b) => b.type);
  if (actual.length !== expectedTypes.length) {
    throw new Error(
      `assertBlockTypes: expected ${expectedTypes.length} blocks, got ${actual.length}`,
    );
  }
  for (let i = 0; i < expectedTypes.length; i++) {
    if (actual[i] !== expectedTypes[i]) {
      throw new Error(
        `assertBlockTypes: at index ${i}, expected "${expectedTypes[i]}", got "${actual[i]}"`,
      );
    }
  }
}

/**
 * Asserts that a rendered output has no failed blocks.
 *
 * @param rendering - Any object that optionally carries `failedBlocks` (e.g., result of `render()`).
 * @throws If `rendering.failedBlocks` is present and non-empty. Error message includes the failure list.
 *
 * @example
 * ```ts
 * import { assertNoFailedBlocks } from "pressedslip/testing";
 *
 * assertNoFailedBlocks(r);
 * ```
 */
export function assertNoFailedBlocks(rendering: WithFailedBlocks): void {
  const failures = rendering.failedBlocks ?? [];
  if (failures.length > 0) {
    throw new Error(
      `assertNoFailedBlocks: found ${failures.length} failure(s): ${JSON.stringify(failures)}`,
    );
  }
}

/**
 * Asserts that two values are structurally equal. Compares plain objects + arrays recursively;
 * by default ignores byte-level Buffer/Uint8Array contents (compares by length only) to sidestep
 * cross-platform determinism noise.
 *
 * @param a - First value.
 * @param b - Second value to compare against `a`.
 * @param opts - Comparison options. Set `ignoreBuffers: false` for byte-level Buffer equality.
 * @throws If a structural divergence is found. Error message includes the path (e.g., `$.blocks[2].data.title`).
 *
 * @example
 * ```ts
 * import { assertStructurallyEqual } from "pressedslip/testing";
 *
 * assertStructurallyEqual(actual, expected);
 * assertStructurallyEqual(actual, expected, { ignoreBuffers: false });
 * ```
 */
export function assertStructurallyEqual<T>(
  a: T,
  b: T,
  opts: CompareOptions = { ignoreBuffers: true },
): void {
  const diff = compareStructurally(a, b, opts);
  if (diff !== null) {
    throw new Error(
      `assertStructurallyEqual: divergence at ${diff.path}${diff.reason ? ` (${diff.reason})` : ""}\n  left:  ${JSON.stringify(diff.left)}\n  right: ${JSON.stringify(diff.right)}`,
    );
  }
}
