import { type ParseError, parse as parseJsonc } from "jsonc-parser";
import type { DraftComposition } from "./state/draft-composition.js";

/**
 * Initial composition shown when the playground first loads. Authored as a
 * JSONC string (with //-comments and trailing commas) so the JSON pane lands
 * with discoverability hints visible. The hints survive arbitrary JSON-pane
 * edits (the App.tsx draft→text sync effect compares canonical forms and
 * skips overwriting when the text already represents the current draft).
 * Any builder mutation (drag, delete, duplicate) flushes the canonical
 * serialization and the comments disappear — reload the page to bring them
 * back.
 */
export const initialCompositionJsonc = `// pressedslip playground seed (visible on initial load).
// Below each slot, lines starting with \`//\` come from BlockDefinition.hints
// and auto-regenerate on every mutation — those are the durable guidance.
// Use the palette on the left to insert blocks; see docs/blocks/
// for the per-block reference pages.

{
  "date": "2026-05-24",
  "subject": { "id": "demo", "name": "Daily Brief" },
  "meta": { "playgroundThemeId": "default" },

  "slots": [
    // Required: \`data.value\`
    // Tip: Set \`data.label\` for an uppercase eyebrow above the value
    // Tip: Remove \`data.caption\` to collapse layout to two lines
    // Docs: docs/blocks/kpi.md
    {
      "blockType": "kpi",
      "title": "WEATHER",
      "data": { "value": "18°C", "label": "BARCELONA", "caption": "Partly cloudy · low 13°C" },
    },

    // Required: \`data.groups\` (min 1), \`data.groups[].items[]\`
    // Tip: Set \`id\` on items to render as bold prefix (e.g. times)
    // Tip: Set \`title\` or \`separator\` on a group for section headers
    // Docs: docs/blocks/list.md
    {
      "blockType": "list",
      "title": "CALENDAR",
      "data": {
        "groups": [
          {
            "title": "MORNING",
            "items": [
              { "id": "09:00", "value": "Weekly sync · Design × Eng" },
              { "id": "10:30", "value": "1-on-1 with Mariana Costa" },
            ],
          },
          {
            "title": "AFTERNOON",
            "items": [
              { "id": "14:00", "value": "Deep work block — do not disturb" },
              { "id": "16:45", "value": "Product demo · Acme Corp" },
            ],
          },
        ],
      },
    },

    {
      "blockType": "list",
      "title": "SHOPPING",
      "data": {
        "groups": [
          {
            "title": "PRODUCE",
            "items": [
              { "value": "Spinach (200 g)" },
              { "value": "Cherry tomatoes" },
              { "value": "2 avocados" },
            ],
          },
          {
            "title": "DAIRY & COLD",
            "items": [
              { "value": "Greek yogurt (500 g)" },
              { "value": "Eggs × 12" },
            ],
          },
        ],
      },
    },

    // Required: \`data.question\`, \`data.answer\`
    // Docs: docs/blocks/qa-pair.md
    {
      "blockType": "qaPair",
      "title": "TRIVIA",
      "data": { "question": "What is the capital of Australia?", "answer": "Canberra." },
    },

    // Required: \`data.text\`
    // Tip: Set \`data.attribution\` to render an em-dash byline right-aligned below the quote
    // Docs: docs/blocks/quotation.md
    {
      "blockType": "quotation",
      "title": "QUOTE",
      "data": { "text": "Make it work, make it right, make it fast.", "attribution": "Kent Beck" },
    },

    // Required: \`data.label\`, \`data.value\`
    // Docs: docs/blocks/key-value.md
    {
      "blockType": "keyValue",
      "title": "DAYLIGHT",
      "data": { "label": "Sunrise · Sunset", "value": "06:22 · 21:04" },
    },

    // Required: \`data.grid\` (2-D array of single chars), \`data.words\`
    // Docs: docs/blocks/word-search.md
    {
      "blockType": "wordSearch",
      "title": "ANIMALS",
      "data": {
        "grid": [
          ["C","A","T","B","C","D"],
          ["D","O","G","A","N","T"],
          ["C","O","W","F","G","H"],
          ["I","J","K","L","M","N"],
          ["O","P","Q","R","S","T"],
          ["U","V","W","X","Y","Z"]
        ],
        "words": ["CAT","DOG","ANT","COW"],
      },
    },

    {
      "blockType": "wordOfDayDemo",
      "title": "WORD OF THE DAY",
      "data": {
        "word": "petrichor",
        "type": "noun",
        "definition": "The pleasant, earthy smell after rain on dry soil.",
        "example": "The petrichor reminded her of summer mornings.",
        "pronunciation": "/ˈpɛtrɪkɔːr/",
      },
    },

    {
      "blockType": "streakDemo",
      "title": "STREAK",
      "data": {
        "days": 4,
        "last7": [true, true, false, true, true, true, true],
        "label": "deep work mornings",
      },
    },

    {
      "blockType": "onThisDayDemo",
      "title": "ON THIS DAY · JUL 20",
      "data": {
        "events": [
          "1969 — Apollo 11 lands on the Moon.",
          "1976 — Viking 1 lands on Mars.",
        ],
        "births": [
          "1304 — Petrarch, Italian scholar and poet.",
          "1947 — Carlos Santana, Mexican-American guitarist.",
        ],
        "deaths": [
          "1937 — Guglielmo Marconi, Italian inventor (radio).",
        ],
      },
    },

    {
      "blockType": "textCell",
      "title": "FOOTER",
      "data": { "text": "Printed Mon 24 May · pressedslip", "align": "center" },
    },
  ],
}
`;

const seedErrors: ParseError[] = [];
const seedParsed = parseJsonc(initialCompositionJsonc, seedErrors, { allowTrailingComma: true });
if (seedErrors.length > 0 || seedParsed === undefined) {
  throw new Error(
    `initial-composition: seed JSONC failed to parse — ${seedErrors
      .map((e) => `offset ${e.offset}: code ${e.error}`)
      .join("; ")}`,
  );
}

/**
 * Canonical object form of the seed, derived from {@link initialCompositionJsonc}.
 * This is the single-source-of-truth for the initial composition's shape; the
 * round-trip is asserted by initial-composition.test.ts.
 */
export const initialComposition: DraftComposition = seedParsed as DraftComposition;
