# qaPair

## Purpose

Renders a question/answer pair as two vertically stacked fields separated by a
deliberate 12 px gap. Distinct from `keyValue` in visual grammar — equal
typographic weight on both fields, paused rather than label-dominant. Covers
trivia, riddles, word-of-day, and would-you-rather patterns.

## Data schema

```ts
{
  question: string;   // required — the question, rendered at 18 px regular weight
  answer:   string;   // required — the answer, rendered at 18 px regular weight below
}
```

Both fields are required. Validated by Zod. No optional fields.

## Examples

```jsonc
// Minimal — both fields required
{
  "blockType": "qaPair",
  "data": {
    "question": "What is the capital of Portugal?",
    "answer": "Lisbon"
  }
}
```

```jsonc
// Typical — daily trivia with shell title
{
  "blockType": "qaPair",
  "title": "Trivia of the day",
  "data": {
    "question": "Which element has the chemical symbol Au?",
    "answer": "Gold (from the Latin aurum)"
  }
}
```

```jsonc
// Edge — multi-line question and answer
{
  "blockType": "qaPair",
  "title": "Riddle",
  "data": {
    "question": "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?",
    "answer": "An echo"
  }
}
```

## Layout notes

The block renders a vertical flex column (gap 12 px, 8 px outer padding, 18 px
font size). Both `question` and `answer` use regular typographic weight — there
is no bold or italic emphasis on either field. The 12 px gap creates visual
breathing room that conveys the pause between posing and answering. Long strings
wrap naturally within the 528 px effective content width (576 px receipt −
2×24 px shell padding). The `BlockShell` adds 16 px vertical padding at the
`normal` setting and a `thin` (1 px) bottom separator by default.

## See also

- **keyValue** — use when the two-field structure is a label at 14 px bold
  above a body value at 18 px; prefer `qaPair` when both fields are equal
  in weight and length.
- **textCell** — use for a single continuous body of text without the
  question/answer two-slot structure.

## Theme-controlled dimensions

| Field | Slot | Default |
|---|---|---|
| `question` | `question` | `{ fontSize: 20 }` |
| `answer` | `answer` | `{ fontSize: 20 }` |

## Block-local intent

None. Both fields are purely theme-controlled.
