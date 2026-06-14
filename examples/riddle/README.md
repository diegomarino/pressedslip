# Riddle

Picks today's riddle by day-of-year from an inline corpus of 20 riddles and
renders it through the built-in `qaPair` block. The answer is rendered
upside-down so the reader has to physically flip the paper — the trick lives
entirely in the theme.

**Block**: `qaPair` (built-in). Same block as `dad-joke`.
**Generator**: pure-offline. No fetch.
**Theme**: `defineTheme` extends the default with a single override —
`shell.textStyles.answer.rotate = 180`. Note `textStyles` lives inside
`shell` (`ShellTheme.textStyles`), not at the theme root.

## Run (Node)

```sh
pnpm example:riddle
```

Writes `examples/riddle/output.png` (gitignored).

## Run (browser)

Open `examples/riddle/example.html` in any modern browser. The PNG renders
automatically on page load; the download link appears beneath the preview.

## What this teaches

- The TextStyle slot system in action: themes can override per-slot
  decorations (rotation, weight, color) without touching the block code.
- A built-in block plus a one-line theme tweak can produce a wholly new
  visual effect.
- `applyShellDefaults` (called inside `loadThemeFonts`) deep-merges
  `shell.textStyles` per-slot over `TEXT_STYLES_DEFAULTS`, so the default
  `answer` font size (20) is preserved alongside the rotate override.
