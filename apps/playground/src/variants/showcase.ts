/**
 * @fileoverview Playground variants for showcase demo blocks.
 * Variants live alongside the existing per-block variant files; they're
 * grouped by demo block type in variantsByBlock.
 */
import { emojiPng } from "./assets/emoji.js";
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
          { text: "Brush teeth", image: { src: emojiPng.toothbrush, alt: "🪥" } },
          { text: "Wash hands", image: { src: emojiPng.soap, alt: "🧼" } },
          { text: "Shoes on", image: { src: emojiPng.shoe, alt: "👟" } },
          { text: "Backpack", image: { src: emojiPng.backpack, alt: "🎒" } },
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
          { text: "Snack", image: { src: emojiPng.apple, alt: "🍎" } },
          { text: "Ballet", image: { src: emojiPng.balletShoes, alt: "🩰" } },
          { text: "Football", image: { src: emojiPng.soccer, alt: "⚽" } },
          { text: "Read a book", image: { src: emojiPng.books, alt: "📚" } },
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
