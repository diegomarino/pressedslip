/**
 * Pattern: fetch live data, map it onto builtin blocks, and never let one
 * failing API sink the slip. Adapted from marplanner's quoteOfDay, onThisDay
 * and weather blocks (MIT). All three APIs are free and need no key.
 *
 *   node live-data.mjs [city] [en|es] > slip.json
 *
 * Titles and weather words come from LABELS; add a language there.
 *
 * Rules marplanner follows:
 * - Every request has a timeout (AbortSignal.timeout).
 * - A thrown error means "try again later"; `null` means "no data today".
 *   Either way the slot is left out instead of printing an empty block.
 * - Cache once per day if the slip is printed more than once.
 */
const TIMEOUT_MS = 8000;
const UA = {
  "User-Agent": "pressedslip-skill-example (https://github.com/diegomarino/pressedslip)",
};

const LABELS = {
  en: {
    weather: "WEATHER",
    quote: "QUOTE",
    onThisDay: "ON THIS DAY",
    groups: ["Events", "Births", "Deaths"],
    rain: "rain",
    sky: {
      0: "Clear",
      1: "Mostly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      61: "Rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Snow",
      80: "Showers",
      95: "Thunderstorm",
    },
    mixed: "Mixed",
  },
  es: {
    weather: "EL TIEMPO",
    quote: "CITA",
    onThisDay: "TAL DÍA COMO HOY",
    groups: ["Acontecimientos", "Nacimientos", "Fallecimientos"],
    rain: "lluvia",
    sky: {
      0: "Despejado",
      1: "Casi despejado",
      2: "Nubes y claros",
      3: "Cubierto",
      45: "Niebla",
      61: "Lluvia",
      63: "Lluvia",
      65: "Lluvia fuerte",
      71: "Nieve",
      80: "Chubascos",
      95: "Tormenta",
    },
    mixed: "Variable",
  },
};

async function getJson(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

/** ZenQuotes quote of the day → builtin `quotation`. */
export async function quoteOfDay(labels = LABELS.en) {
  const [first] = await getJson("https://zenquotes.io/api/today");
  if (!first?.q) return null;
  return {
    blockType: "quotation",
    title: labels.quote,
    data: { text: first.q.replace(/^["“]|["”]$/g, ""), attribution: first.a?.trim() || "Unknown" },
  };
}

/** Three items spread across the list (start, middle, end) rather than the first three. */
function pickThirds(items, count = 3) {
  if (items.length <= count) return items;
  return Array.from(
    { length: count },
    (_, i) => items[Math.floor((i * (items.length - 1)) / (count - 1))],
  );
}

/** Wikipedia "on this day" → builtin `list`, one group per kind. */
export async function onThisDay(date, language = "en", labels = LABELS[language] ?? LABELS.en) {
  const [, mm, dd] = date.split("-");
  const json = await getJson(
    `https://${language}.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`,
  );
  const groups = [
    [labels.groups[0], json.events],
    [labels.groups[1], json.births],
    [labels.groups[2], json.deaths],
  ]
    .filter(([, items]) => items?.length)
    .map(([title, items]) => ({
      title,
      items: pickThirds([...items].sort((a, b) => a.year - b.year)).map((item) => ({
        id: String(item.year),
        value: item.text,
      })),
    }));
  if (groups.length === 0) return null;
  return { blockType: "list", title: labels.onThisDay, data: { groups } };
}

/** Open-Meteo forecast for a city name → builtin `kpi`. */
export async function weather(city, labels = LABELS.en) {
  const geo = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`,
  );
  const place = geo.results?.[0];
  if (!place) return null;
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    timezone: "auto",
    forecast_days: "1",
  });
  const { daily } = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const max = Math.round(daily.temperature_2m_max[0]);
  const min = Math.round(daily.temperature_2m_min[0]);
  const code = daily.weather_code[0];
  return {
    blockType: "kpi",
    title: labels.weather,
    data: {
      label: place.name.toUpperCase(),
      value: `${max}° / ${min}°`,
      caption: `${labels.sky[code] ?? labels.mixed} · ${labels.rain} ${daily.precipitation_probability_max[0]}%`,
    },
  };
}

/** Run every source in parallel; drop the ones that fail or have nothing. */
export async function slots(date, city = "Madrid", language = "en") {
  const labels = LABELS[language] ?? LABELS.en;
  // ZenQuotes is English-only; Wikipedia has a feed per language.
  const results = await Promise.allSettled([
    weather(city, labels),
    ...(language === "en" ? [quoteOfDay(labels)] : []),
    onThisDay(date, language, labels),
  ]);
  return results.flatMap((r) => {
    if (r.status === "rejected") console.error(`skipped: ${r.reason.message}`);
    return r.status === "fulfilled" && r.value ? [r.value] : [];
  });
}

if (process.argv[1]?.endsWith("live-data.mjs")) {
  const date = new Date().toISOString().slice(0, 10);
  console.log(
    JSON.stringify({ date, slots: await slots(date, process.argv[2], process.argv[3]) }, null, 2),
  );
}
