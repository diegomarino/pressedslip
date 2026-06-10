# TextStyles — theme reference

`ShellTheme.textStyles` is a map of 6 canonical slots that control typography across all
built-in and showcase blocks. Pass it as part of a custom `theme` to `render()`.

## Canonical slots

| Slot | Default | Blocks that use it |
|---|---|---|
| `body` | `{ fontSize: 20 }` | textCell (text), keyValue (value), list (item.value) |
| `emphasis` | `{}` | list (group.title, item.id), quotation (text) |
| `display` | `{ fontSize: 36, lineHeight: 1.1 }` | kpi (value) |
| `label` | `{ fontSize: 16 }` | kpi (label, caption), keyValue (label), quotation (attribution) |
| `question` | `{ fontSize: 20 }` | qaPair (question) |
| `answer` | `{ fontSize: 20 }` | qaPair (answer) |
| `extras` | `{}` | Showcase blocks (word-of-day, etc.) |

## Built-in block → slot mapping

| Block | Field | Slot | Block-local intent (not overridable) |
|---|---|---|---|
| **kpi** | `label` | `label` | `textTransform:"uppercase"`, `letterSpacing:1` |
| | `value` | `display` | `fontWeight:700` |
| | `caption` | `label` (×0.85) | `color:"#666"` |
| **keyValue** | `label` | `label` | `fontWeight:700` |
| | `value` | `body` | — |
| **list** | `group.title` | `emphasis` | `fontWeight:700` |
| | `item.id` | `emphasis` | `fontWeight:700` |
| | `item.value` | `body` | — |
| **qaPair** | `question` | `question` | — |
| | `answer` | `answer` | — |
| **quotation** | `text` | `emphasis` | `fontStyle:"italic"` |
| | `attribution` | `label` | — |
| **textCell** | `text` | `body` | — |

## Intent inviolability

Block-local intent properties (bold, italic, uppercase) spread **after** the slot result.
A theme cannot suppress them — see `intent-inviolability.test.tsx`.

## Example: custom theme

```ts
import { render, themes } from "pressedslip";

// Spread a builtin ThemeTemplate and override only the textStyles you want.
// Bare `{ textStyles: {...} }` is not a valid ThemeInput — it fails the
// ThemeTemplate | PreparedTheme union check. Always start from a template.
const customTheme = {
  ...themes.default,
  shell: {
    ...themes.default.shell,
    textStyles: {
      body:    { fontSize: 18 },
      display: { fontSize: 48, lineHeight: 1.0 },
      label:   { fontSize: 12 },
    },
  },
};

const result = await render(composition, {
  registry,
  theme: customTheme,
});
```

A downstream theme package can provide a fully-tuned typographic stack overriding
all slots (see the BYO-bytes pattern, ADR-0024).
