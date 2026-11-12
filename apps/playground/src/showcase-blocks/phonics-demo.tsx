/** @jsxRuntime automatic */
/** @jsxImportSource react */
// Demo block for the pressedslip playground. Uses pressedslip's public
// defineBlock API as a consumer would. Not part of pressedslip's built-in
// catalog. The JSX pragmas let Node scripts (scripts/docs/) render this file
// with the automatic runtime too.
import type { BlockDefinition } from "pressedslip/browser";
import { applyTextStyle, defineBlock } from "pressedslip/browser";
import { type ZodType, z } from "zod";

type PhonicsWord = { word: string; graphemes: string[]; tricky?: boolean | undefined };

const phonicsDemoSchema: ZodType<{ words: PhonicsWord[] }> = z.object({
  words: z
    .array(
      z
        .object({
          word: z.string().min(1),
          graphemes: z.array(z.string().min(1)).min(1),
          tricky: z.boolean().optional(),
        })
        .refine((w) => w.graphemes.join("") === w.word, {
          message: "graphemes must join back into word",
        }),
    )
    .min(1)
    .max(6),
});

export type PhonicsDemoData = z.infer<typeof phonicsDemoSchema>;

/**
 * Conservative advance of one character, in em: an upper bound across the
 * builtin faces (Inter, Atkinson Hyperlegible, JetBrains Mono), so the word
 * fits whatever the theme. Monospaced faces advance exactly 0.6 em per glyph,
 * so no class goes below that; wide letters (m, w, M, W) approach 1 em in
 * proportional faces. Accents are ignored (NFD base letter); anything
 * unrecognised counts as a full em.
 */
export function phonicsAdvanceEm(char: string): number {
  const base = char.normalize("NFD")[0] ?? char;
  if (/[mwMW@%]/.test(base)) return 1;
  if (/[A-Z0-9]/.test(base)) return 0.8;
  if (/[a-z]/.test(base)) return 0.66;
  if (/[\s'.,!?-]/.test(base)) return 0.6;
  return 1;
}

/** Font ceiling: 160 px is ~20 mm at 203 dpi, so short words don't fill the whole slip. */
export const PHONICS_MAX_FONT_PX = 160;

/** Largest font size at which the widest word fits `contentWidth`, capped at PHONICS_MAX_FONT_PX. */
export function phonicsFontSize(words: readonly PhonicsWord[], contentWidth: number): number {
  const widestEm = Math.max(
    1,
    ...words.map((w) => [...w.word].reduce((em, c) => em + phonicsAdvanceEm(c), 0)),
  );
  const fitted = Math.floor((contentWidth - 16) / widestEm);
  return Math.max(1, Math.min(PHONICS_MAX_FONT_PX, fitted));
}

/**
 * Demo block — early-reader words in very large letters with "sound buttons":
 * a dot under each single-letter grapheme, a dash under each digraph or
 * trigraph ("sh", "igh"). Tricky words print without marks.
 *
 * Each grapheme is its own flex column, so Satori measures the real glyph
 * width and the mark centres under it whatever the theme's font. Marks are
 * plain boxes (backgroundColor + borderRadius), which print crisply at 1 bit
 * and need no glyph coverage.
 */
export const phonicsDemoBlock: BlockDefinition<PhonicsDemoData> = defineBlock({
  type: "phonicsDemo",
  schema: phonicsDemoSchema,
  render: ({ data, ctx }) => {
    const fontSize = phonicsFontSize(data.words, ctx.contentWidth);
    const ink = ctx.theme.textStyles.body?.color ?? "#000";
    const dot = Math.max(6, Math.round(fontSize * 0.13));
    const dash = Math.max(4, Math.round(fontSize * 0.08));
    const letterStyle = {
      ...applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles),
      fontSize,
      lineHeight: 1.3,
      color: ink,
      whiteSpace: "pre" as const,
    };
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: Math.round(fontSize * 0.15),
        }}
      >
        {data.words.map((word) => (
          <div key={word.word} style={{ display: "flex", flexDirection: "row" }}>
            {word.graphemes.map((grapheme, gi) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: graphemes repeat within a word ("p-o-p")
                key={gi}
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <div style={{ display: "flex", ...letterStyle }}>{grapheme}</div>
                {word.tricky !== true && (
                  <div
                    style={
                      [...grapheme].length === 1
                        ? { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: ink }
                        : {
                            alignSelf: "stretch",
                            marginLeft: Math.round(fontSize * 0.08),
                            marginRight: Math.round(fontSize * 0.08),
                            height: dash,
                            borderRadius: dash / 2,
                            backgroundColor: ink,
                          }
                    }
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.words`: 1–6 `{ word, graphemes }`; graphemes must join back into word",
    "Tip: one-letter graphemes get a dot, digraphs/trigraphs (`sh`, `igh`) get a dash",
    "Tip: set `tricky: true` on irregular words to print them without marks",
    "Tip: the font fits the widest word, capped at 160 px — try the mono theme",
  ],
});
