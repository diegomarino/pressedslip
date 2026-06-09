# TextStyles — theme reference

`ShellTheme.textStyles` is a map of 6 canonical slots that control typography across all
built-in and showcase blocks. Pass it as part of a custom `theme` to `render()`.

## Canonical slots

| Slot | Default | Blocks that use it |
|---|---|---|
| `body` | `{ fontSize: 16 }` | textCell (text), keyValue (value), list (item.value) |
| `emphasis` | `{}` | list (group.title, item.id), quotation (text) |
| `display` | `{ fontSize: 36, lineHeight: 1.1 }` | kpi (value) |
| `label` | `{ fontSize: 14 }` | kpi (label, caption), keyValue (label), quotation (attribution) |
| `question` | `{ fontSize: 18 }` | qaPair (question) |
| `answer` | `{ fontSize: 18 }` | qaPair (answer) |
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
import { render } from "pressedslip";

const result = await render(composition, {
  theme: {
    textStyles: {
      body:    { fontSize: 18 },
      display: { fontSize: 48, lineHeight: 1.0 },
      label:   { fontSize: 12 },
    },
  },
});
```

`pressedslip-theme` and `marplanner-theme` provide fully-tuned typographic stacks
that override all slots. See their respective packages for details.
