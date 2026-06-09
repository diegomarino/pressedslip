/**
 * @fileoverview Playground variants for showcase demo blocks.
 * Variants live alongside the existing per-block variant files; they're
 * grouped by demo block type in variantsByBlock.
 */
import type { Variant } from "./index.js";

export const wordOfDayDemoVariants: Variant[] = [
  {
    id: "word-of-day-demo-petrichor",
    label: "word-of-day-demo · petrichor",
    slot: {
      blockType: "wordOfDayDemo",
      title: "WORD OF THE DAY",
      data: {
        word: "petrichor",
        type: "noun",
        definition: "The pleasant, earthy smell after rain on dry soil.",
        example: "The petrichor reminded her of summer mornings.",
        pronunciation: "/ˈpɛtrɪkɔːr/",
      },
    },
  },
];

export const streakDemoVariants: Variant[] = [
  {
    id: "streak-demo-focus",
    label: "streak-demo · deep work streak (12d, 1 miss)",
    slot: {
      blockType: "streakDemo",
      title: "STREAK",
      data: {
        days: 12,
        last7: [true, true, false, true, true, true, true],
        label: "deep work mornings",
      },
    },
  },
];

export const onThisDayDemoVariants: Variant[] = [
  {
    id: "on-this-day-demo-jul20",
    label: "on-this-day-demo · July 20 (try switching theme!)",
    slot: {
      blockType: "onThisDayDemo",
      title: "ON THIS DAY · JUL 20",
      data: {
        events: [
          "1969 — Apollo 11 lands on the Moon.",
          "1976 — Viking 1 lands on Mars.",
          "1969 — First human steps on lunar surface by Neil Armstrong.",
        ],
        births: [
          "1304 — Petrarch, Italian scholar and poet.",
          "1947 — Carlos Santana, Mexican-American guitarist.",
        ],
        deaths: [
          "1937 — Guglielmo Marconi, Italian inventor (radio).",
          "1944 — Claus von Stauffenberg, German military officer.",
        ],
      },
    },
  },
];
