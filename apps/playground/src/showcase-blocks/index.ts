/**
 * @fileoverview Showcase-only demo blocks for the pressedslip playground.
 * Spread these into `createRegistry([...builtinBlocks, ...showcaseBlocks])`.
 * NOT part of pressedslip's built-in catalog — view-source signal that adopters
 * can build similar blocks via the public `defineBlock` API. Also rendered from
 * Node by scripts/docs/render-visual-refs.ts for the docs images.
 */
import type { AnyBlockDefinition } from "pressedslip/browser";
import { drawingPromptDemoBlock } from "./drawing-prompt-demo.js";
import { onThisDayDemoBlock } from "./on-this-day-demo.js";
import { phonicsDemoBlock } from "./phonics-demo.js";
import { routineDemoBlock } from "./routine-demo.js";
import { streakDemoBlock } from "./streak-demo.js";
import { wordOfDayDemoBlock } from "./word-of-day-demo.js";

export {
  drawingPromptDemoBlock,
  onThisDayDemoBlock,
  phonicsDemoBlock,
  routineDemoBlock,
  streakDemoBlock,
  wordOfDayDemoBlock,
};

export const showcaseBlocks: readonly AnyBlockDefinition[] = Object.freeze([
  wordOfDayDemoBlock,
  streakDemoBlock,
  onThisDayDemoBlock,
  phonicsDemoBlock,
  routineDemoBlock,
  drawingPromptDemoBlock,
]);
