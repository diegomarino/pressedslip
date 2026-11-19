# Ways to build slip data

A slip is only as good as its content. These patterns come from
[marplanner](https://github.com/diegomarino/marplanner), a household planner that prints
a daily briefing per family member on an 80 mm printer. Its 22 blocks were
rewritten here without app internals and with made-up data. All files are in
`patterns/`; copy one into the user's project before running or adapting it.

## Generate, then render

marplanner keeps two steps apart:

1. A **generator** produces plain JSON data for a block (from a corpus, an
   API, a calculation or a database) and stores it as that day's snapshot.
2. The **render** step turns snapshots into a slip.

As an agent you are the generator. Write content directly when the user
asks for something creative (a story prompt, a personalised note, quiz
questions on a topic), and use code when the data must be exact, live or
repeatable. Keep the JSON as the record of what was printed.

| Pattern | File | Shows | Builtin blocks |
|---|---|---|---|
| Seeded daily pick | `seeded-pick.mjs` | Same item all day and a new one tomorrow (`hashSeed(date + "\|joke")`); daily shuffle for turn-taking | qaPair, list |
| Live APIs | `live-data.mjs` | Open-Meteo weather, Wikipedia "on this day", ZenQuotes; timeouts; failed sources skipped, not printed empty | kpi, list, quotation |
| Dates and calendar | `dates-and-calendar.mjs` | Birthday countdown with Feb 29; agenda sorted all-day first, emoji stripped, lines truncated to fit | list, kpi |
| Theme override | `upside-down-theme.mjs` | Theme module overriding a text style (same as `--upside-down-answers`) | qaPair |
| Word search | `../scripts/word-search.mjs` | Seeded grid from any word list, 3 difficulty levels | wordSearch |
| Custom text block | `riddle-block.tsx` | Theme text styles inside a block, rotated answer | custom |
| Computed shapes | `streak-block.tsx` | Habit streak from booleans, dots drawn as boxes, weekday letters by language | custom |
| Pictures | `emoji-checklist.tsx` | Emoji → Noto SVG → PNG → dithered image, for pre-readers | custom + image |

Run a `.mjs` pattern to get a composition:
`node patterns/live-data.mjs Madrid es > slip.json`. `live-data.mjs` has
English and Spanish labels; add a language to its `LABELS`. A `.tsx` pattern exports
`blocks` (for `--blocks`) and `exampleSlots`.

## Ideas from marplanner's blocks

Each of these is a builtin block plus a data source:

| Block idea | Data | Print with |
|---|---|---|
| Joke, riddle, would-you-rather, animal fact | Small corpus, seeded by date | qaPair, textCell |
| Trivia | Question plus options, seeded per date and person | qaPair (options in the question) |
| Word of the day | Word, pronunciation, definition, example; level by age | list or a custom block |
| Number fact | Day of year → number → fact | kpi (`value` = number, `caption` = fact) |
| Quote of the day | ZenQuotes, cached once per day | quotation |
| On this day | Wikipedia feed, three items spread over the list | list with `id` = year |
| Weather | Open-Meteo for the household's location | kpi |
| Today | Calendar events for that person | list with `id` = time |
| Reminders | To-dos, as pictures for kids who can't read | list, or emoji checklist |
| Meals | Lunch, snack, dinner from a menu plan | list with `id` = meal |
| Birthday | Countdown to own and family birthdays | kpi, list |
| Streak | Last 7 days of a routine | custom streak block, or kpi (`value` = days) |
| Front seat | Daily seeded ranking of names | list with `id` = position |
| Drawing prompt | Seeded prompt and an empty frame to draw in | textCell + custom frame |
| Phonics | Early-reader words in huge type with sound buttons | custom (see the playground's phonics-demo) |
| Word search | Themed word list → seeded grid | wordSearch via script |
| Personal message | A note from a parent | textCell |

## Good habits

- **Seed by date and person** (`${date}|${person}|trivia`) so siblings get
  different items and reprints match.
- **Each block gets its own seed suffix**, so changing one corpus doesn't
  reshuffle the others.
- **Set a timeout on every request** and drop the block if its source fails.
  A slip without the quote is better than no slip.
- **Normalise text for the font**: strip emoji, replace IPA if the font lacks
  it, truncate lines to ~36 characters in lists.
- **Use made-up names** in anything committed or shared. Real slips often
  hold family names, birthdays and calendars.
- **Respect data licences.** Wiktionary (CC BY-SA) and Open Trivia DB
  (CC BY-SA) need attribution; some fact collections have no licence at all.
