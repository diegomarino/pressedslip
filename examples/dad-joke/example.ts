/**
 * Dad Joke example — generator + render in one file.
 *
 * Picks today's joke by day-of-year mod corpus.length from an inline corpus
 * and renders it through the built-in `qaPair` block.
 *
 * Run:  pnpm example:dad-joke
 * Out:  ./output.png
 */
import { writeFile } from "node:fs/promises";
import { builtinBlocks, createRegistry, loadThemeFonts, render, themes } from "pressedslip";

const jokes: ReadonlyArray<{ setup: string; punchline: string }> = [
  { setup: "Why don't skeletons fight each other?", punchline: "They don't have the guts." },
  { setup: "I'm reading a book about anti-gravity.", punchline: "It's impossible to put down." },
  { setup: "Why did the scarecrow get promoted?", punchline: "He was outstanding in his field." },
  { setup: "What do you call cheese that isn't yours?", punchline: "Nacho cheese." },
  {
    setup: "I told my wife she was drawing her eyebrows too high.",
    punchline: "She looked surprised.",
  },
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything." },
  { setup: "What did the ocean say to the shore?", punchline: "Nothing, it just waved." },
  { setup: "How do you organize a space party?", punchline: "You planet." },
  { setup: "I used to hate facial hair.", punchline: "Then it grew on me." },
  { setup: "Why did the bicycle fall over?", punchline: "It was two tired." },
  { setup: "What do you call a fake noodle?", punchline: "An impasta." },
  {
    setup: "I would tell you a chemistry joke, but I know I wouldn't get a reaction.",
    punchline: "Maybe a tepid one.",
  },
  { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up." },
  { setup: "What's brown and sticky?", punchline: "A stick." },
  { setup: "Why did the math book look sad?", punchline: "It had too many problems." },
  { setup: "I'm on a seafood diet.", punchline: "I see food and I eat it." },
  { setup: "How do you make a tissue dance?", punchline: "Put a little boogie in it." },
  { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear." },
  { setup: "Why did the coffee file a police report?", punchline: "It got mugged." },
  { setup: "Did you hear about the kidnapping at the playground?", punchline: "They woke up." },
  { setup: "I'm afraid of speed bumps.", punchline: "But I'm slowly getting over it." },
  { setup: "Why did the cookie go to the doctor?", punchline: "Because it was feeling crumby." },
  { setup: "What do you call a sleeping bull?", punchline: "A bulldozer." },
  { setup: "I told my dog a joke about a tail.", punchline: "He didn't get it — too long." },
  { setup: "Why don't oysters share their pearls?", punchline: "Because they're shellfish." },
  { setup: "How does a penguin build its house?", punchline: "Igloos it together." },
  {
    setup: "What did the grape do when it got stepped on?",
    punchline: "Nothing, it just let out a little wine.",
  },
  {
    setup: "Why did the golfer bring two pairs of pants?",
    punchline: "In case he got a hole in one.",
  },
  {
    setup: "I asked the librarian if they had books about paranoia.",
    punchline: "She whispered, 'They're right behind you.'",
  },
  { setup: "What does a clock do when it's hungry?", punchline: "It goes back four seconds." },
];

function dayOfYear(now: Date = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const diff = now.getTime() - start;
  return Math.floor(diff / 86_400_000);
}

const pick = jokes[dayOfYear() % jokes.length]!;

const registry = createRegistry(builtinBlocks);
const theme = await loadThemeFonts(themes.default);

const today = new Date().toISOString().slice(0, 10);
const { bytes, failedBlocks } = await render(
  {
    id: `dad-joke-${today}`,
    version: 1,
    date: today,
    status: "ready",
    slots: [
      {
        index: 0,
        blockType: "qaPair",
        data: { question: pick.setup, answer: pick.punchline },
        title: "Dad joke of the day",
      },
    ],
  },
  { registry, theme },
);

const outUrl = new URL("./output.png", import.meta.url);
await writeFile(outUrl, bytes);

if (failedBlocks.length > 0) {
  console.warn("[dad-joke] failed blocks:", failedBlocks);
}
console.log(`[dad-joke] wrote ${outUrl.pathname} (${pick.setup})`);
