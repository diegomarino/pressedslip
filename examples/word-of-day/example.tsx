/**
 * Word of the Day example — generator + custom block + render in one file.
 *
 * Picks today's word by day-of-year mod corpus.length and renders it through
 * a custom block defined inline via `defineBlock`. The block lays out five
 * fields (word, type, pronunciation, definition, example) using the
 * `applyTextStyle` helper to read theme slots — a pattern lifted from
 * `apps/playground/src/showcase-blocks/word-of-day-demo.tsx`.
 *
 * Run:  pnpm example:word-of-day
 * Out:  ./output.png
 */
import { writeFile } from "node:fs/promises";
import {
  applyTextStyle,
  builtinBlocks,
  createRegistry,
  defineBlock,
  defineTheme,
  loadThemeFonts,
  render,
  themes,
} from "pressedslip";
// React must be in scope because tsx defaults to the classic JSX transform
// outside an explicit jsx-runtime tsconfig; this keeps the example portable.
import * as React from "react";
import { type ZodType, z } from "zod";

type WordOfDayData = {
  word: string;
  type: string;
  pronunciation: string;
  definition: string;
  example: string;
};

const wordOfDaySchema: ZodType<WordOfDayData> = z.object({
  word: z.string(),
  type: z.string(),
  pronunciation: z.string(),
  definition: z.string(),
  example: z.string(),
});

const wordOfDayBlock = defineBlock({
  type: "wordOfDay",
  schema: wordOfDaySchema,
  render: ({ data, ctx }) => {
    const displayStyle = applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles);
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    const emphasisStyle = applyTextStyle(ctx.theme.textStyles.emphasis, ctx.fontRoles);
    return (
      <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={displayStyle}>{data.word}</div>
        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <span style={labelStyle}>{data.type}</span>
          <span style={labelStyle}>{data.pronunciation}</span>
        </div>
        <div style={bodyStyle}>{data.definition}</div>
        <div
          style={{
            ...emphasisStyle,
            fontStyle: "italic",
            textAlign: "right",
            width: "100%",
          }}
        >{`“${data.example}”`}</div>
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
});

const corpus: ReadonlyArray<WordOfDayData> = [
  {
    word: "Petrichor",
    type: "noun",
    pronunciation: "/ˈpɛtrɪkɔːr/",
    definition: "The pleasant, earthy smell after rain on dry ground.",
    example: "After the drought, the petrichor was almost intoxicating.",
  },
  {
    word: "Sonder",
    type: "noun",
    pronunciation: "/ˈsɒndər/",
    definition: "The realization that each passerby has a life as vivid as your own.",
    example: "Standing in the train station, she was struck by a sudden sonder.",
  },
  {
    word: "Limerence",
    type: "noun",
    pronunciation: "/ˈlɪmərəns/",
    definition: "An involuntary state of intense romantic infatuation.",
    example: "He confused limerence for love and made a fool of himself.",
  },
  {
    word: "Sisu",
    type: "noun",
    pronunciation: "/ˈsiːsuː/",
    definition: "Finnish concept of stoic determination in the face of adversity.",
    example: "It was sheer sisu that got the climbers to the summit.",
  },
  {
    word: "Saudade",
    type: "noun",
    pronunciation: "/saʊˈdɑːdə/",
    definition: "A deep, melancholic longing for something or someone absent.",
    example: "She felt a quiet saudade for the city of her childhood.",
  },
  {
    word: "Hiraeth",
    type: "noun",
    pronunciation: "/ˈhɪraɪθ/",
    definition: "Welsh: a homesickness for a home you cannot return to, or that never was.",
    example: "There is a hiraeth in old folk songs that nobody can quite name.",
  },
  {
    word: "Mamihlapinatapai",
    type: "noun",
    pronunciation: "/mɑmɪɬɑpɪnɑtɑˌpaɪ/",
    definition:
      "A look shared by two people, each wishing the other would do what both desire but neither will.",
    example: "Across the dinner table, they shared a long mamihlapinatapai.",
  },
  {
    word: "Komorebi",
    type: "noun",
    pronunciation: "/koːmoːrɛbi/",
    definition: "Japanese: sunlight filtering through leaves.",
    example: "The forest path was dappled with komorebi.",
  },
  {
    word: "Iktsuarpok",
    type: "noun",
    pronunciation: "/ɪkˈtsuːɑːrpɒk/",
    definition:
      "Inuit: the anticipation that makes you keep looking out to see if someone is coming.",
    example: "He paced by the window in iktsuarpok, expecting his daughter at any moment.",
  },
  {
    word: "Wabi-sabi",
    type: "noun",
    pronunciation: "/ˌwɑːbi ˈsɑːbi/",
    definition: "Japanese aesthetic of finding beauty in imperfection and transience.",
    example: "The chipped ceramic bowl was an exercise in wabi-sabi.",
  },
  {
    word: "Querencia",
    type: "noun",
    pronunciation: "/kɛˈɾɛnθja/",
    definition: "A place where one feels safe and most authentically oneself.",
    example: "The library was her querencia on rainy afternoons.",
  },
  {
    word: "Apricity",
    type: "noun",
    pronunciation: "/əˈprɪsɪti/",
    definition: "The warmth of the sun in winter.",
    example: "He sat on the bench, soaking in the apricity of January.",
  },
  {
    word: "Eudaimonia",
    type: "noun",
    pronunciation: "/juːdɪˈmoʊniə/",
    definition: "Greek: human flourishing or the highest good.",
    example: "Aristotle held that eudaimonia comes from living virtuously.",
  },
  {
    word: "Numinous",
    type: "adjective",
    pronunciation: "/ˈnuːmɪnəs/",
    definition: "Having a strong spiritual or supernatural quality.",
    example: "The mountaintop at dawn felt numinous.",
  },
  {
    word: "Liminal",
    type: "adjective",
    pronunciation: "/ˈlɪmɪnəl/",
    definition: "Occupying a position on a boundary; transitional.",
    example: "Airports are liminal spaces — neither home nor destination.",
  },
  {
    word: "Ephemeral",
    type: "adjective",
    pronunciation: "/ɪˈfɛmərəl/",
    definition: "Lasting for a very short time.",
    example: "Cherry blossoms are loved because they are ephemeral.",
  },
  {
    word: "Halcyon",
    type: "adjective",
    pronunciation: "/ˈhælsɪən/",
    definition: "Denoting a period of time in the past that was idyllically happy.",
    example: "She spoke of the halcyon days of her university years.",
  },
  {
    word: "Mellifluous",
    type: "adjective",
    pronunciation: "/məˈlɪfluəs/",
    definition: "Pleasingly smooth and musical to hear.",
    example: "His mellifluous voice could narrate a phone book and make it gripping.",
  },
  {
    word: "Susurrus",
    type: "noun",
    pronunciation: "/suˈsʌrəs/",
    definition: "A whispering, rustling, or murmuring sound.",
    example: "All night, the susurrus of leaves outside the tent.",
  },
  {
    word: "Defenestrate",
    type: "verb",
    pronunciation: "/diːˈfɛnɪstreɪt/",
    definition: "To throw someone or something out of a window.",
    example: "Frustrated with the manuscript, he threatened to defenestrate the typewriter.",
  },
  {
    word: "Crepuscular",
    type: "adjective",
    pronunciation: "/krɪˈpʌskjʊlər/",
    definition: "Of, resembling, or relating to twilight.",
    example: "Many cats are crepuscular hunters.",
  },
  {
    word: "Ineffable",
    type: "adjective",
    pronunciation: "/ɪnˈɛfəbəl/",
    definition: "Too great or extreme to be expressed in words.",
    example: "The grief was ineffable; she simply held her hand.",
  },
  {
    word: "Pareidolia",
    type: "noun",
    pronunciation: "/ˌpɛrɪˈdoʊliə/",
    definition: "The tendency to perceive a meaningful image in random patterns.",
    example: "Faces in clouds are a classic example of pareidolia.",
  },
  {
    word: "Aubade",
    type: "noun",
    pronunciation: "/oʊˈbɑːd/",
    definition: "A poem or piece of music appropriate to the dawn.",
    example: "The trumpeter played a soft aubade as the sun rose.",
  },
  {
    word: "Nepenthe",
    type: "noun",
    pronunciation: "/nɪˈpɛnθi/",
    definition: "A drug or potion that causes forgetfulness of suffering.",
    example: "She wished for a nepenthe to numb the day.",
  },
  {
    word: "Velleity",
    type: "noun",
    pronunciation: "/vəˈliːɪti/",
    definition: "A wish or inclination not strong enough to lead to action.",
    example: "His desire to learn cello was a mere velleity.",
  },
  {
    word: "Yūgen",
    type: "noun",
    pronunciation: "/ˈjuːɡɛn/",
    definition: "Japanese: a profound, mysterious sense of the beauty of the universe.",
    example: "The deep forest filled him with yūgen.",
  },
  {
    word: "Tsundoku",
    type: "noun",
    pronunciation: "/tsuːnˈdoʊkuː/",
    definition: "Japanese: acquiring books and letting them pile up unread.",
    example: "His apartment was an architectural marvel of tsundoku.",
  },
  {
    word: "Fernweh",
    type: "noun",
    pronunciation: "/ˈfɛrnveː/",
    definition: "German: an ache for distant places; the opposite of homesickness.",
    example: "The travel posters gave her acute fernweh.",
  },
  {
    word: "Resfeber",
    type: "noun",
    pronunciation: "/ˈreːsfeːbər/",
    definition: "Swedish: the restless beat of a traveler's heart before a journey.",
    example: "The night before her flight, resfeber kept her awake.",
  },
];

function dayOfYear(now: Date = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - start) / 86_400_000);
}

const pick = corpus[dayOfYear() % corpus.length]!;

const registry = createRegistry([...builtinBlocks, wordOfDayBlock]);

// Extend the default theme with an Inter italic 400 face so the usage-example
// line at the bottom of the block can actually render in italic. Satori
// requires a matching font face to be loaded — `fontStyle: "italic"` alone
// silently falls back to upright when no italic face is available.
const wordOfDayTheme = defineTheme({
  ...themes.default,
  id: "word-of-day-italic",
  roleUrls: {
    ...themes.default.roleUrls,
    body: [
      ...(themes.default.roleUrls.body ?? []),
      {
        family: "Inter",
        url: "https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc2dthjQ.ttf",
        weight: 400,
        style: "italic",
      },
    ],
  },
});
const theme = await loadThemeFonts(wordOfDayTheme);

const today = new Date().toISOString().slice(0, 10);
const { bytes, failedBlocks } = await render(
  {
    id: `word-of-day-${today}`,
    version: 1,
    date: today,
    status: "ready",
    slots: [
      {
        index: 0,
        blockType: "wordOfDay",
        data: pick,
        title: "Word of the day",
      },
    ],
  },
  { registry, theme },
);

const outUrl = new URL("./output.png", import.meta.url);
await writeFile(outUrl, bytes);

if (failedBlocks.length > 0) {
  console.warn("[word-of-day] failed blocks:", failedBlocks);
}
console.log(`[word-of-day] wrote ${outUrl.pathname} (${pick.word})`);
