/**
 * Riddle example — generator + render in one file.
 *
 * Picks today's riddle by day-of-year mod corpus.length from an inline corpus
 * and renders it through the built-in `qaPair` block. The cleverness lives in
 * the theme: a single override (`textStyles.answer.rotate = 180`) flips the
 * answer upside-down so the reader has to physically turn the paper. No new
 * block needed.
 *
 * Run:  pnpm example:riddle
 * Out:  ./output.png
 */
import { writeFile } from "node:fs/promises";
import {
  builtinBlocks,
  createRegistry,
  defineTheme,
  loadThemeFonts,
  render,
  themes,
} from "pressedslip";

const riddles: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question:
      "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?",
    answer: "An echo.",
  },
  {
    question: "The more you take, the more you leave behind. What are they?",
    answer: "Footsteps.",
  },
  {
    question: "I'm tall when I'm young, and I'm short when I'm old. What am I?",
    answer: "A candle.",
  },
  { question: "What has hands but cannot clap?", answer: "A clock." },
  { question: "What has a head and a tail but no body?", answer: "A coin." },
  { question: "What gets wetter the more it dries?", answer: "A towel." },
  {
    question:
      "I have keys but no locks. I have space but no room. You can enter, but you can't go inside. What am I?",
    answer: "A keyboard.",
  },
  { question: "What has many teeth but cannot bite?", answer: "A comb." },
  {
    question: "What can travel around the world while staying in a corner?",
    answer: "A postage stamp.",
  },
  { question: "The more there is, the less you see. What is it?", answer: "Darkness." },
  {
    question: "What has cities but no houses, forests but no trees, and rivers but no water?",
    answer: "A map.",
  },
  {
    question: "I'm light as a feather, yet the strongest person can't hold me for long. What am I?",
    answer: "A breath.",
  },
  { question: "What goes up but never comes down?", answer: "Your age." },
  { question: "What has one eye but cannot see?", answer: "A needle." },
  { question: "What can you catch but not throw?", answer: "A cold." },
  { question: "Forward I'm heavy, backward I'm not. What am I?", answer: "The word 'ton'." },
  { question: "What has a neck but no head?", answer: "A bottle." },
  { question: "I have branches, but no fruit, trunk, or leaves. What am I?", answer: "A bank." },
  { question: "What is full of holes but still holds water?", answer: "A sponge." },
  { question: "What word becomes shorter when you add two letters to it?", answer: "Short." },
];

function dayOfYear(now: Date = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - start) / 86_400_000);
}

const pick = riddles[dayOfYear() % riddles.length]!;

// The didactic point: same `qaPair` block as `dad-joke`, but the theme flips
// the answer slot 180° so the reader has to turn the paper upside-down.
// `textStyles` lives inside `shell` (ShellTheme.textStyles); applyShellDefaults
// deep-merges per-slot over TEXT_STYLES_DEFAULTS, so the default `answer`
// fontSize (20) is preserved automatically.
const riddleTheme = defineTheme({
  ...themes.default,
  id: "riddle-rotated",
  shell: {
    ...themes.default.shell,
    textStyles: { answer: { rotate: 180 } },
  },
});

const registry = createRegistry(builtinBlocks);
const theme = await loadThemeFonts(riddleTheme);

const today = new Date().toISOString().slice(0, 10);
const { bytes, failedBlocks } = await render(
  {
    id: `riddle-${today}`,
    version: 1,
    date: today,
    status: "ready",
    slots: [
      {
        index: 0,
        blockType: "qaPair",
        data: { question: pick.question, answer: pick.answer },
        title: "Riddle of the day",
      },
    ],
  },
  { registry, theme },
);

const outUrl = new URL("./output.png", import.meta.url);
await writeFile(outUrl, bytes);

if (failedBlocks.length > 0) {
  console.warn("[riddle] failed blocks:", failedBlocks);
}
console.log(`[riddle] wrote ${outUrl.pathname} (${pick.question})`);
