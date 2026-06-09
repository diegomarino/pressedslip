/**
 * @fileoverview Sample data scenarios for qaPairBlock.
 */
import type { QaPairData } from "./qa-pair.js";

/**
 * Map of scenario name → valid QaPairData for qaPairBlock.
 *
 * @example
 * import { qaPairFixtures } from "pressedslip/testing";
 * const data = qaPairFixtures.riddle;
 */
export const qaPairFixtures: Record<string, QaPairData> = {
  riddle: {
    question: "What has keys but no locks, space but no room, and you can enter but not go in?",
    answer: "A keyboard.",
  },
  trivia: {
    question: "What is the largest planet in our solar system?",
    answer: "Jupiter.",
  },
  wouldYouRather: {
    question: "Would you rather fly or be invisible?",
    answer: "Fly — invisibility is just a slow-motion liability.",
  },
};
