/**
 * Pattern: data computed from dates and from a calendar, printed with builtin
 * blocks. Adapted from marplanner's birthday and today blocks (MIT).
 *
 *   node dates-and-calendar.mjs [YYYY-MM-DD] > slip.json
 *
 * The events can come from anywhere the agent can read: an .ics file, a
 * calendar MCP tool, a JSON export. Shape them as { title, start, allDay }.
 */
const MS_PER_DAY = 86_400_000;
/** About 40 characters fit on one 80 mm line in the default theme; leave margin. */
const MAX_LINE_CHARS = 36;
const MAX_EVENTS = 10;

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Days from `today` (YYYY-MM-DD) to the next {month, day}. Feb 29 falls on Feb 28 in common years. */
export function daysUntil(month, day, today) {
  const [y, m, d] = today.split("-").map(Number);
  const now = Date.UTC(y, m - 1, d);
  const on = (year) =>
    Date.UTC(year, month - 1, month === 2 && day === 29 && !isLeap(year) ? 28 : day);
  const next = on(y) >= now ? on(y) : on(y + 1);
  return Math.round((next - now) / MS_PER_DAY);
}

/** Text fonts have no emoji: strip them (and VS16) or they print as blanks. */
export const stripEmoji = (s) =>
  s
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .trim();

const truncate = (s, max) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

/** All-day first, then by start time; "HH:MM title", emoji-free and one line each. */
export function agendaItems(events, timeZone) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return [...events]
    .sort((a, b) =>
      a.allDay !== b.allDay ? (a.allDay ? -1 : 1) : new Date(a.start) - new Date(b.start),
    )
    .slice(0, MAX_EVENTS)
    .map((e) => {
      const title = stripEmoji(e.title);
      return {
        value: truncate(
          e.allDay ? title : `${time.format(new Date(e.start))} ${title}`,
          MAX_LINE_CHARS,
        ),
      };
    });
}

// Sample data. Use made-up names in anything you commit.
const BIRTHDAYS = [
  { name: "Lisa", month: 5, day: 9 },
  { name: "Bart", month: 2, day: 29 },
  { name: "Maggie", month: 12, day: 1 },
];
const EVENTS = [
  { title: "Dentist 🦷", start: "2026-11-19T09:30:00+01:00", allDay: false },
  { title: "School trip", start: "2026-11-19", allDay: true },
  {
    title: "Piano lesson with Ms. Hoover at the community centre",
    start: "2026-11-19T17:00:00+01:00",
    allDay: false,
  },
];

export function slots(date) {
  const upcoming = BIRTHDAYS.map((b) => ({
    name: b.name,
    days: daysUntil(b.month, b.day, date),
  })).sort((a, b) => a.days - b.days);
  const [next] = upcoming;
  return [
    {
      blockType: "list",
      title: "TODAY",
      data: { groups: [{ items: agendaItems(EVENTS, "Europe/Madrid") }] },
    },
    {
      blockType: "kpi",
      title: "BIRTHDAYS",
      data: {
        label: next.name.toUpperCase(),
        value: next.days === 0 ? "TODAY!" : `${next.days} days`,
        caption: upcoming
          .slice(1)
          .map((b) => `${b.name} ${b.days}d`)
          .join(" · "),
      },
    },
  ];
}

if (process.argv[1]?.endsWith("dates-and-calendar.mjs")) {
  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  console.log(JSON.stringify({ date, slots: slots(date) }, null, 2));
}
