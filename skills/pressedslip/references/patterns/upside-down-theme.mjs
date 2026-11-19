/**
 * Pattern: change how a builtin block looks by overriding the theme, not by
 * writing a block. Here every `qaPair` answer prints upside down, so riddles
 * and quizzes make the reader flip the paper. Adapted from marplanner's
 * render theme (MIT). For just this, `render.mjs --upside-down-answers` is
 * enough; use a theme module to combine it with other overrides.
 *
 *   node <skill>/scripts/render.mjs slip.json --theme ./upside-down-theme.mjs
 *
 * Copy this file into your project first: its import resolves from here.
 * Text style roles are listed in ../composition.md. Only rotate 0 and 180 are safe.
 */
import { themes } from "pressedslip";

const base = themes.default;

export const theme = {
  ...base,
  shell: {
    ...base.shell,
    textStyles: {
      ...base.shell.textStyles,
      answer: { ...base.shell.textStyles?.answer, rotate: 180 },
    },
  },
};
