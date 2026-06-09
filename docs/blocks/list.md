# list

## Purpose

Renders a flat or sectioned list of items. A list is one or more groups, each
with an optional title and optional item-level ID prefix, supporting both simple
bullet-style lists and structured id:value catalogs (e.g., On This Day
events/births/deaths).

## Data schema

```ts
{
  groups: [          // required — minimum 1 group (Zod .min(1))
    {
      title?:     string;   // optional — bold group heading rendered above items
      separator?: string;   // optional — string inserted between id and value
                            //   when item.id is present (e.g. ".", ":", " —")
      items: [              // required — array of items in this group
        {
          id?:    string;   // optional — bold prefix rendered before separator+value
          value:  string;   // required — the item text
        }
        // ... (no minimum on items array)
      ];
    }
    // ... additional groups
  ];
}
```

All fields validated by Zod. No `.default()` in the schema.

## Examples

```jsonc
// Minimal — single group, plain items (no id)
{
  "blockType": "list",
  "data": {
    "groups": [
      {
        "items": [
          { "value": "Buy oat milk" },
          { "value": "Review pull request #42" },
          { "value": "Call dentist" }
        ]
      }
    ]
  }
}
```

```jsonc
// Typical — sectioned list with group titles and id:value items
{
  "blockType": "list",
  "title": "On This Day",
  "data": {
    "groups": [
      {
        "title": "Events",
        "separator": " — ",
        "items": [
          { "id": "1969", "value": "Moon landing" },
          { "id": "1989", "value": "Berlin Wall falls" }
        ]
      },
      {
        "title": "Births",
        "separator": " — ",
        "items": [
          { "id": "1564", "value": "William Shakespeare" }
        ]
      }
    ]
  }
}
```

```jsonc
// Edge — mixed: first group has ids, second group is plain
{
  "blockType": "list",
  "title": "Portfolio snapshot",
  "data": {
    "groups": [
      {
        "title": "Holdings",
        "separator": ": ",
        "items": [
          { "id": "AAPL", "value": "$182.34  (+1.2%)" },
          { "id": "BTC",  "value": "$67,400  (-0.8%)" }
        ]
      },
      {
        "title": "Notes",
        "items": [
          { "value": "Rebalance due end of month" }
        ]
      }
    ]
  }
}
```

## Layout notes

The block renders a vertical flex column (gap 8 px between groups, gap 4 px
between items within a group, 8 px outer padding). Each group title renders at
`fontWeight: 700`. Each item is a flex row: when `id` is present, the id is
rendered bold followed immediately by `group.separator` (if any) and then
`value`; when `id` is absent, only `value` is rendered as plain text. The
package does not parse `value` to extract an id — consumers must pass
pre-structured items. Long `value` strings wrap naturally within the 528 px
effective content width (576 px receipt − 2×24 px shell padding). The
`BlockShell` applies `showTitle: true` and a `thin` (1 px) bottom separator
by default.

## See also

- **keyValue** — use for a single label:value pair with fixed typographic
  treatment; prefer `list` when you have multiple pairs or need group headings.
- **qaPair** — use when the two-field structure is a question followed by its
  answer rather than an enumerated list.

## Theme-controlled dimensions

| Field | Slot | Default |
|---|---|---|
| `group.title` | `emphasis` | `{}` |
| `item.id` | `emphasis` | `{}` |
| `item.value` | `body` | `{ fontSize: 20 }` |

## Block-local intent

| Field | Property | Value | Why |
|---|---|---|---|
| `group.title` | `fontWeight` | `700` | Identity: section title is always bold |
| `item.id` | `fontWeight` | `700` | Identity: item identifier is always bold |
