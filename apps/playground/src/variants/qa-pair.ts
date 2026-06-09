/**
 * @fileoverview Playground variants for qaPairBlock.
 */
import type { Variant } from "./index.js";

export const qaPairVariants: Variant[] = [
  {
    id: "qa-pair-trivia",
    label: "qa-pair · daily trivia (geography)",
    slot: {
      blockType: "qaPair",
      title: "TRIVIA",
      data: {
        question: "Which country has the most UNESCO World Heritage Sites?",
        answer: "Italy, with 59 sites as of 2024 — edging out China by two.",
      },
    },
  },
  {
    id: "qa-pair-riddle",
    label: "qa-pair · morning riddle",
    slot: {
      blockType: "qaPair",
      title: "RIDDLE",
      data: {
        question:
          "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?",
        answer: "An echo.",
      },
    },
  },
  {
    id: "qa-pair-interview",
    label: "qa-pair · interview flashcard (tech wildcard)",
    slot: {
      blockType: "qaPair",
      title: "PREP",
      data: {
        question: "What is the difference between concurrency and parallelism?",
        answer:
          "Concurrency is about dealing with multiple tasks at once (structure); parallelism is about doing multiple tasks at the same instant (execution). You can have concurrency without parallelism.",
      },
    },
  },
];
