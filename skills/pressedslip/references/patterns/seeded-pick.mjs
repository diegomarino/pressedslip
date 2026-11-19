/**
 * Pattern: pick from a corpus by date, so every reprint of the same day gives
 * the same item and tomorrow gives a different one.
 * Adapted from marplanner's dadJoke / riddle / shotgun blocks (MIT).
 *
 *   node seeded-pick.mjs [YYYY-MM-DD] > slip.json
 */
import { createHash } from "node:crypto";

/** SHA-1 of the input as an unsigned 32-bit integer. */
export function hashSeed(input) {
  return createHash("sha1").update(input).digest().readUInt32BE(0);
}

/** Mulberry32 seeded PRNG. */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic shuffle: the same (items, seed) always gives the same order. */
export function fisherYates(items, seed) {
  const out = [...items];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const JOKES = [
  { question: "Why did the scarecrow get promoted?", answer: "He was outstanding in his field." },
  { question: "What do you call a fake noodle?", answer: "An impasta." },
  { question: "Why don't eggs tell jokes?", answer: "They'd crack each other up." },
  { question: "How do you organize a space party?", answer: "You planet." },
];

const RIDERS = ["Homer", "Marge", "Bart", "Lisa"];

export function slots(date) {
  // The suffix keeps blocks independent: the joke and the ranking don't move together.
  const joke = JOKES[hashSeed(`${date}|joke`) % JOKES.length];
  // A per-day ranking (marplanner's "shotgun": who gets the front seat today).
  const order = fisherYates(RIDERS, hashSeed(`${date}|shotgun`));
  return [
    { blockType: "qaPair", title: "JOKE OF THE DAY", data: joke },
    {
      blockType: "list",
      title: "FRONT SEAT",
      data: { groups: [{ items: order.map((name, i) => ({ id: `${i + 1}.`, value: name })) }] },
    },
  ];
}

if (process.argv[1]?.endsWith("seeded-pick.mjs")) {
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  console.log(JSON.stringify({ date, slots: slots(date) }, null, 2));
}
