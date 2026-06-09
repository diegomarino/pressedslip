/**
 * @fileoverview Sample data scenarios for wordSearchBlock.
 * Hand-crafted 6×6 grid with 4 hidden words (DART, CAT, DOG, SUN).
 * Letters outside the words are uppercase consonants to avoid accidental matches.
 */
import type { WordSearchData } from "./word-search.js";

/**
 * Map of scenario name → valid WordSearchData for wordSearchBlock. Scenario keys are NOT covered by
 * semver — they may rename or be added in patch releases.
 *
 * @example
 * ```ts
 * import { wordSearchFixtures } from "pressedslip/testing";
 * const data = wordSearchFixtures.basic;
 * ```
 */
export const wordSearchFixtures: Record<string, WordSearchData> = {
  basic: {
    grid: [
      ["D", "A", "R", "T", "B", "C"], // DART at row 0, cols 0–3
      ["F", "C", "A", "T", "G", "H"], // CAT  at row 1, cols 1–3
      ["D", "O", "G", "L", "M", "N"], // DOG  at row 2, cols 0–2
      ["S", "U", "N", "P", "Q", "R"], // SUN  at row 3, cols 0–2
      ["B", "C", "F", "V", "W", "X"],
      ["Y", "Z", "B", "C", "D", "F"],
    ],
    words: ["DART", "CAT", "DOG", "SUN"],
  },
  animals: {
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
  colors: {
    grid: [
      ["R", "E", "D", "B", "C", "D"],
      ["B", "L", "U", "E", "F", "G"],
      ["H", "J", "K", "L", "M", "N"],
      ["G", "O", "L", "D", "P", "Q"],
      ["R", "S", "T", "V", "W", "X"],
      ["Y", "Z", "B", "C", "D", "F"],
    ],
    words: ["RED", "BLUE", "GOLD"],
  },
  spanish: {
    // Demonstrates accented vowels and ñ in grid cells — JetBrains Mono supports extended Latin.
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
};
