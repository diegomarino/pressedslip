/**
 * @fileoverview Example slips for the playground's "Example" menu. Also the
 * source of the README hero: scripts/docs/render-visual-refs.ts renders the
 * same three drafts side by side, so the image and the playground never
 * drift apart. NOT public package API.
 */
import { wordSearchFixtures } from "pressedslip/testing";
import type { DraftComposition } from "./state/draft-composition.js";
import {
  drawingPromptDemoVariants,
  phonicsDemoVariants,
  riddleDemoVariants,
  routineDemoVariants,
  streakDemoVariants,
  wordOfDayDemoVariants,
} from "./variants/showcase.js";

/** Builtin theme ids, duplicated from render-with-wasm.ts so Node scripts can import this file. */
export type PresetThemeId = "default" | "mono" | "compact";

/** One loadable example slip. */
export type Preset = {
  id: string;
  label: string;
  themeId: PresetThemeId;
  draft: DraftComposition;
};

/** Pull a variant's slot by id; throws at import time if a variant is renamed. */
function slotOf<T extends { id: string; slot: DraftComposition["slots"][number] }>(
  variants: readonly T[],
  id: string,
): DraftComposition["slots"][number] {
  const found = variants.find((v) => v.id === id);
  if (found === undefined) throw new Error(`presets: unknown variant ${id}`);
  return structuredClone(found.slot);
}

function draft(
  name: string,
  themeId: PresetThemeId,
  slots: DraftComposition["slots"],
): DraftComposition {
  return {
    date: "2026-06-09",
    subject: { id: name.toLowerCase().replace(/[^a-z]+/g, "-"), name },
    meta: { playgroundThemeId: themeId },
    slots,
  };
}

export const presets: readonly Preset[] = [
  {
    id: "morning",
    label: "Morning briefing",
    themeId: "default",
    draft: draft("Good morning, María", "default", [
      {
        blockType: "kpi",
        title: "WEATHER",
        data: { value: "18°C", label: "OLEIROS", caption: "Partly cloudy · low 13°C" },
      },
      {
        blockType: "list",
        title: "TODAY",
        data: {
          groups: [
            {
              items: [
                { id: "09:00", value: "Weekly sync · Design × Eng" },
                { id: "14:00", value: "Deep work block" },
                { id: "16:45", value: "Product demo · Acme Corp" },
              ],
            },
          ],
        },
      },
      slotOf(wordOfDayDemoVariants, "word-of-day-demo-petrichor"),
      {
        blockType: "quotation",
        title: "QUOTE",
        data: { text: "Make it work, make it right, make it fast.", attribution: "Kent Beck" },
      },
      slotOf(streakDemoVariants, "streak-demo-focus"),
      {
        blockType: "keyValue",
        title: "DAYLIGHT",
        data: { label: "Sunrise · Sunset", value: "06:22 · 21:04" },
      },
    ]),
  },
  {
    id: "kids",
    label: "Kids' morning",
    themeId: "mono",
    draft: draft("Leo's morning", "mono", [
      slotOf(phonicsDemoVariants, "phonics-demo-cvc"),
      slotOf(routineDemoVariants, "routine-demo-morning"),
    ]),
  },
  {
    id: "puzzles",
    label: "Puzzle time",
    themeId: "compact",
    draft: draft("Puzzle time", "compact", [
      slotOf(riddleDemoVariants, "riddle-demo-clock"),
      { blockType: "wordSearch", title: "FIND 6 ANIMALS", data: wordSearchFixtures.animals },
      {
        ...slotOf(drawingPromptDemoVariants, "drawing-prompt-demo-dragon"),
        data: { prompt: "Draw a dragon eating breakfast.", height: 400 },
      },
    ]),
  },
];
