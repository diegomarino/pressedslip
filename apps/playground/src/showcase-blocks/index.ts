/**
 * @fileoverview Showcase-only demo blocks for the pressedslip playground.
 * Spread these into `createRegistry([...builtinBlocks, ...showcaseBlocks])`.
 * NOT part of pressedslip's built-in catalog — view-source signal that adopters
 * can build similar blocks via the public `defineBlock` API.
 */
import type { AnyBlockDefinition } from "pressedslip/browser";
import { onThisDayDemoBlock } from "./on-this-day-demo.js";
import { streakDemoBlock } from "./streak-demo.js";
import { wordOfDayDemoBlock } from "./word-of-day-demo.js";

export { onThisDayDemoBlock, streakDemoBlock, wordOfDayDemoBlock };

export const showcaseBlocks: readonly AnyBlockDefinition[] = Object.freeze([
  wordOfDayDemoBlock,
  streakDemoBlock,
  onThisDayDemoBlock,
]);
