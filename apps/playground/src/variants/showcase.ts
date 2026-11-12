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

export const phonicsDemoVariants: Variant[] = [
  {
    id: "phonics-demo-digraphs",
    label: "phonics-demo · sound buttons (dots + digraph dashes)",
    slot: {
      blockType: "phonicsDemo",
      title: "READ ME",
      data: {
        words: [
          { word: "ship", graphemes: ["sh", "i", "p"] },
          { word: "night", graphemes: ["n", "igh", "t"] },
          { word: "the", graphemes: ["the"], tricky: true },
        ],
      },
    },
  },
  {
    id: "phonics-demo-cvc",
    label: "phonics-demo · three-letter words (capped at 160 px)",
    slot: {
      blockType: "phonicsDemo",
      title: "READ ME",
      data: {
        words: [
          { word: "cat", graphemes: ["c", "a", "t"] },
          { word: "dog", graphemes: ["d", "o", "g"] },
        ],
      },
    },
  },
];

export const routineDemoVariants: Variant[] = [
  {
    id: "routine-demo-morning",
    label: "routine-demo · morning checklist with emoji",
    slot: {
      blockType: "routineDemo",
      title: "BEFORE SCHOOL",
      data: {
        items: [
          { text: "Brush teeth", emoji: "toothbrush" },
          { text: "Wash hands", emoji: "soap" },
          { text: "Shoes on", emoji: "shoe" },
          { text: "Backpack", emoji: "backpack" },
        ],
      },
    },
  },
  {
    id: "routine-demo-after-school",
    label: "routine-demo · after school (light colours dithered)",
    slot: {
      blockType: "routineDemo",
      title: "AFTER SCHOOL",
      data: {
        items: [
          { text: "Snack", emoji: "apple" },
          { text: "Ballet", emoji: "balletShoes" },
          { text: "Football", emoji: "soccer" },
          { text: "Read a book", emoji: "books" },
        ],
      },
    },
  },
];

export const drawingPromptDemoVariants: Variant[] = [
  {
    id: "drawing-prompt-demo-dragon",
    label: "drawing-prompt-demo · draw a dragon",
    slot: {
      blockType: "drawingPromptDemo",
      title: "DRAW IT",
      data: { prompt: "Draw a dragon eating breakfast.", height: 300 },
    },
  },
];

export const riddleDemoVariants: Variant[] = [
  {
    id: "riddle-demo-clock",
    label: "riddle-demo · answer printed upside down",
    slot: {
      blockType: "riddleDemo",
      title: "RIDDLE",
      data: { question: "What has hands but can't clap?", answer: "A clock" },
    },
  },
  {
    id: "riddle-demo-towel",
    label: "riddle-demo · what gets wetter the more it dries?",
    slot: {
      blockType: "riddleDemo",
      title: "RIDDLE",
      data: { question: "What gets wetter the more it dries?", answer: "A towel" },
    },
  },
];
