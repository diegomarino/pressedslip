/**
 * @fileoverview Playground variants for wordSearchBlock.
 */
import type { Variant } from "./index.js";

export const wordSearchVariants: Variant[] = [
  {
    id: "word-search-basic",
    label: "word-search · 6×6 grid, 4 words",
    slot: {
      blockType: "wordSearch",
      title: "WORD SEARCH",
      data: {
        grid: [
          ["D", "A", "R", "T", "B", "C"],
          ["F", "C", "A", "T", "G", "H"],
          ["D", "O", "G", "L", "M", "N"],
          ["S", "U", "N", "P", "Q", "R"],
          ["B", "C", "F", "V", "W", "X"],
          ["Y", "Z", "B", "C", "D", "F"],
        ],
        words: ["DART", "CAT", "DOG", "SUN"],
      },
    },
  },
  {
    id: "word-search-spanish",
    label: "word-search · Spanish (ñ, accents)",
    slot: {
      blockType: "wordSearch",
      title: "SOPA DE LETRAS",
      data: {
        grid: [
          ["M", "A", "Ñ", "A", "N", "A"],
          ["C", "A", "F", "É", "B", "C"],
          ["N", "I", "Ñ", "O", "D", "F"],
          ["G", "J", "K", "L", "M", "N"],
          ["P", "Q", "R", "Á", "V", "W"],
          ["X", "Y", "Z", "B", "C", "D"],
        ],
        words: ["MAÑANA", "CAFÉ", "NIÑO"],
      },
    },
  },
  {
    id: "word-search-12x12",
    label: "word-search · 12×12 grid (max square)",
    slot: {
      blockType: "wordSearch",
      title: "PUZZLE",
      data: {
        grid: Array.from({ length: 12 }, (_, _r) =>
          Array.from({ length: 12 }, (_, c) => "ABCDEFGHIJKL".charAt(c % 12)),
        ),
        words: ["ABC", "DEF", "GHI", "JKL"],
      },
    },
  },
  {
    id: "word-search-6x12",
    label: "word-search · 6×12 wide grid",
    slot: {
      blockType: "wordSearch",
      title: "ANCHO",
      data: {
        grid: Array.from({ length: 6 }, (_, _r) =>
          Array.from({ length: 12 }, (_, c) => "ABCDEFGHIJKL".charAt(c % 12)),
        ),
        words: ["ABC", "DEF", "GHI"],
      },
    },
  },
  {
    id: "word-search-12x6",
    label: "word-search · 12×6 tall grid",
    slot: {
      blockType: "wordSearch",
      title: "ALTO",
      data: {
        grid: Array.from({ length: 12 }, (_, _r) =>
          Array.from({ length: 6 }, (_, c) => "ABCDEF".charAt(c % 6)),
        ),
        words: ["ABC", "DEF"],
      },
    },
  },
  {
    id: "word-search-large",
    label: "word-search · 8×10 grid, 6 words (stress test)",
    slot: {
      blockType: "wordSearch",
      title: "ANIMALS",
      data: {
        grid: [
          ["C", "A", "T", "B", "F", "G", "H", "J", "K", "L"],
          ["D", "O", "G", "M", "N", "P", "Q", "R", "S", "T"],
          ["F", "O", "X", "V", "W", "X", "Y", "Z", "B", "C"],
          ["B", "A", "T", "D", "F", "G", "H", "J", "K", "L"],
          ["O", "W", "L", "M", "N", "P", "Q", "R", "S", "T"],
          ["R", "A", "T", "V", "W", "X", "Y", "Z", "B", "C"],
          ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M"],
          ["N", "P", "Q", "R", "S", "T", "V", "W", "X", "Y"],
        ],
        words: ["CAT", "DOG", "FOX", "BAT", "OWL", "RAT"],
      },
    },
  },
];
