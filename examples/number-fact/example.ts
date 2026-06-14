/**
 * Number Fact example — generator + render in one file.
 *
 * Picks today's number trivia by `new Date().getDate()` from an inline
 * corpus of 31 hand-written facts, then renders it through the built-in
 * `kpi` block. No external API, no custom block, no theme overrides.
 *
 * Run:  pnpm example:number-fact
 * Out:  ./output.png
 */
import { writeFile } from "node:fs/promises";
import { builtinBlocks, createRegistry, loadThemeFonts, render, themes } from "pressedslip";

const facts: Record<number, string> = {
  1: "is the only positive integer that is neither prime nor composite.",
  2: "is the only even prime number.",
  3: "is the smallest odd prime and the number of dimensions humans perceive.",
  4: "is the only number whose name in English has the same number of letters as its value.",
  5: "is the number of Platonic solids: tetrahedron, cube, octahedron, dodecahedron, icosahedron.",
  6: "is the smallest perfect number: 1 + 2 + 3 = 6.",
  7: "is the number of continents, days in a week, and notes in a Western diatonic scale.",
  8: "is the number of bits in a byte and the only cube that is one less than a square.",
  9: "is the number such that every multiple has digits that sum to a multiple of 9.",
  10: "is the base of the decimal system, dating back to ancient counting on fingers.",
  11: "is the smallest two-digit prime and the number of players on a soccer team.",
  12: "is the number of signs in the zodiac, months in a year, and hours on a clock face.",
  13: "is considered unlucky in many Western cultures but lucky in Italy.",
  14: "is the atomic number of silicon, the second-most-abundant element in Earth's crust.",
  15: "is a triangular number: 1 + 2 + 3 + 4 + 5 = 15.",
  16: "is the only number of the form x^y = y^x with distinct positive integers (2^4 = 4^2).",
  17: "is the number of syllables in a haiku (5-7-5) and a Fermat prime.",
  18: "is the number of holes in a standard round of golf.",
  19: "is the number of years in the Metonic cycle, which aligns lunar and solar calendars.",
  20: "is the highest score on a single dart throw (treble 20).",
  21: "is the number of spots on a standard six-sided die (1+2+3+4+5+6).",
  22: "is the catch in Joseph Heller's novel; also the atomic number of titanium.",
  23: "is the number of pairs of chromosomes in a human cell.",
  24: "is the number of hours in a day and frames per second in classic cinema.",
  25: "is a perfect square (5^2) and the smallest pseudoprime in base 7.",
  26: "is the number of letters in the English alphabet.",
  27: "is 3^3 and the number of bones in a human hand.",
  28: "is the second perfect number: 1 + 2 + 4 + 7 + 14 = 28.",
  29: "is the only month-end day that appears once every four years.",
  30: "is the number of degrees in each section of a clock face.",
  31: "is a Mersenne prime: 2^5 - 1 = 31.",
};

const day = new Date().getDate();
const fact = facts[day] ?? "is just a number.";

const registry = createRegistry(builtinBlocks);
const theme = await loadThemeFonts(themes.default);

const today = new Date().toISOString().slice(0, 10);
const { bytes, failedBlocks } = await render(
  {
    id: `number-fact-${today}`,
    version: 1,
    date: today,
    status: "ready",
    slots: [
      {
        index: 0,
        blockType: "kpi",
        data: { value: String(day), caption: fact },
        title: "Number of the day",
      },
    ],
  },
  { registry, theme },
);

const outUrl = new URL("./output.png", import.meta.url);
await writeFile(outUrl, bytes);

if (failedBlocks.length > 0) {
  console.warn("[number-fact] failed blocks:", failedBlocks);
}
console.log(`[number-fact] wrote ${outUrl.pathname} (day ${day}: ${day} ${fact})`);
