/** @jsxRuntime automatic */
/** @jsxImportSource react */
/**
 * Pattern: a computed habit streak drawn with plain boxes. Adapted from
 * marplanner's streak block (MIT), which computes `last7` from a routines board.
 *
 * Boxes with a background or border print crisply at 1 bit and need no font
 * glyphs, unlike "●○" characters, which depend on the font.
 */
import { applyTextStyle, type BlockDefinition, defineBlock } from "pressedslip";
import { type ZodType, z } from "zod";

type StreakData = { days: number; last7: boolean[]; label?: string | undefined };

const schema: ZodType<StreakData> = z.object({
  days: z.number().int().nonnegative(),
  last7: z.array(z.boolean()).length(7),
  label: z.string().optional(),
});

const DAY_LETTERS = { en: "SMTWTFS", es: "DLMXJVS" } as const;

export const streakBlock: BlockDefinition<StreakData> = defineBlock({
  type: "streak",
  schema,
  render: ({ data, ctx }) => {
    const ink = ctx.theme.textStyles.body?.color ?? "#000";
    const language = ctx.composition.meta?.language === "es" ? "es" : "en";
    // Weekday letter for each of the 7 days before the composition date.
    const today = new Date(`${ctx.composition.date}T00:00:00Z`).getUTCDay();
    const letters = data.last7.map((_, i) => DAY_LETTERS[language][(today - 7 + i + 7) % 7]);
    return (
      <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles)}>
            {data.days}
          </span>
          {data.label && (
            <span style={applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles)}>
              {data.label}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {data.last7.map((done, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 7-day strip
              key={i}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: `3px solid ${ink}`,
                  backgroundColor: done ? ink : "#fff",
                }}
              />
              <div style={{ display: "flex", fontSize: 18 }}>{letters[i]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
});

export const blocks = [streakBlock];

/** Days in a row ending yesterday, from a newest-last list of booleans. */
export const currentStreak = (history: boolean[]): number =>
  history.length - 1 - history.lastIndexOf(false);

const history = [true, true, false, true, true, true, true, true];
export const exampleSlots = [
  {
    blockType: "streak",
    title: "READING STREAK",
    data: { days: currentStreak(history), label: "days in a row", last7: history.slice(-7) },
  },
];
