#!/usr/bin/env node
/**
 * Build a deterministic word-search slot for the builtin `wordSearch` block.
 *
 *   node word-search.mjs --words gato,perro,pato [--difficulty easy|medium|hard]
 *                        [--seed 2026-11-19] [--title "WORD SEARCH"] [--into slip.json]
 *
 * Prints the slot as JSON, or writes it into the `slots` of `--into`: it
 * replaces the first existing wordSearch slot (keeping its position) or is
 * appended at the end, so running it again doesn't add a second puzzle. Same
 * words + seed always give the same grid. Placement is ported from marplanner's
 * daily-briefing word search (MIT), with a local PRNG instead of patching
 * Math.random. No dependencies.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

/** Grid size, word lengths and directions per difficulty (marplanner's profiles). */
export const PROFILES = {
  easy: { size: 8, maxWords: 10, minLength: 3, directions: ["E"], backwards: 0 },
  medium: {
    size: 10,
    maxWords: 12,
    minLength: 3,
    directions: ["E", "S", "SE", "NE"],
    backwards: 0.15,
  },
  hard: {
    size: 12,
    maxWords: 14,
    minLength: 3,
    directions: ["N", "S", "E", "W", "NE", "NW", "SE", "SW"],
    backwards: 0.3,
  },
};

const DIRECTIONS = {
  N: [-1, 0],
  S: [1, 0],
  E: [0, 1],
  W: [0, -1],
  NE: [-1, 1],
  NW: [-1, -1],
  SE: [1, 1],
  SW: [1, -1],
};
const MAX_ATTEMPTS_PER_WORD = 200;

/** SHA-1 of the input as an unsigned 32-bit integer. */
export function hashSeed(input) {
  return createHash("sha1").update(input).digest().readUInt32BE(0);
}

/** Mulberry32: a small seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uppercase, strip accents (keeping Ñ) and drop anything that is not a letter. */
export function normalizeWord(word) {
  return [...word.toUpperCase()]
    .map((ch) => (ch === "Ñ" ? ch : ch.normalize("NFD").replace(/\p{M}/gu, "")))
    .join("")
    .replace(/[^A-ZÑ]/g, "");
}

/**
 * Place `words` in a square grid. Longer words go first so they find room;
 * words that don't fit are returned in `skipped`.
 */
export function buildWordSearch(words, { difficulty = "easy", seed = "" } = {}) {
  const profile = PROFILES[difficulty];
  if (!profile) throw new Error(`unknown difficulty "${difficulty}"`);
  const { size, maxWords, minLength, directions, backwards } = profile;
  const rand = mulberry32(hashSeed(`${seed}|wordSearch|${difficulty}`));

  const unique = [...new Set(words.map(normalizeWord))];
  const skipped = unique.filter((w) => w.length < minLength || w.length > size);
  const candidates = unique
    .filter((w) => w.length >= minLength && w.length <= size)
    .sort((a, b) => b.length - a.length);

  const grid = Array.from({ length: size }, () => new Array(size).fill(null));
  const placed = [];
  for (const word of candidates) {
    if (placed.length >= maxWords) {
      skipped.push(word);
      continue;
    }
    let done = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_WORD && !done; attempt++) {
      const [baseRow, baseCol] = DIRECTIONS[directions[Math.floor(rand() * directions.length)]];
      const flip = rand() < backwards ? -1 : 1;
      const dRow = baseRow * flip;
      const dCol = baseCol * flip;
      const row = Math.floor(rand() * size);
      const col = Math.floor(rand() * size);
      const cells = [...word].map((_, i) => [row + dRow * i, col + dCol * i]);
      const fits = cells.every(
        ([r, c], i) =>
          r >= 0 &&
          r < size &&
          c >= 0 &&
          c < size &&
          (grid[r][c] === null || grid[r][c] === word[i]),
      );
      if (fits) {
        cells.forEach(([r, c], i) => {
          grid[r][c] = word[i];
        });
        placed.push(word);
        done = true;
      }
    }
    if (!done) skipped.push(word);
  }

  const alphabet = placed.some((w) => w.includes("Ñ"))
    ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"
    : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const row of grid) {
    for (let c = 0; c < size; c++) {
      row[c] ??= alphabet[Math.floor(rand() * alphabet.length)];
    }
  }
  // Show the list alphabetically so its order gives no hint about placement.
  return { grid, words: [...placed].sort(), skipped };
}

function main() {
  const { values } = parseArgs({
    options: {
      words: { type: "string" },
      difficulty: { type: "string", default: "easy" },
      seed: { type: "string", default: new Date().toISOString().slice(0, 10) },
      title: { type: "string" },
      into: { type: "string" },
    },
  });
  if (!values.words) {
    console.error(
      "usage: word-search.mjs --words a,b,c [--difficulty easy|medium|hard] [--seed s] [--title t] [--into slip.json]",
    );
    process.exit(2);
  }
  const { grid, words, skipped } = buildWordSearch(values.words.split(","), values);
  if (skipped.length > 0) {
    console.error(`word-search.mjs: could not place ${skipped.join(", ")}`);
  }
  if (words.length === 0) {
    console.error("word-search.mjs: no word could be placed");
    process.exit(1);
  }
  const slot = {
    blockType: "wordSearch",
    ...(values.title && { title: values.title }),
    data: { grid, words },
  };
  if (values.into) {
    const slip = JSON.parse(readFileSync(values.into, "utf8"));
    const slots = slip.slots ?? [];
    const existing = slots.findIndex((s) => s.blockType === "wordSearch");
    if (existing === -1) slots.push(slot);
    else slots[existing] = slot;
    slip.slots = slots;
    writeFileSync(values.into, `${JSON.stringify(slip, null, 2)}\n`);
    console.error(
      `word-search.mjs: ${existing === -1 ? "added" : "replaced"} slot ${existing === -1 ? slots.length - 1 : existing} (${words.length} words) in ${values.into}`,
    );
  } else {
    console.log(JSON.stringify(slot, null, 2));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
