/**
 * Weather example — live API + fallback + custom block with inline SVG icon.
 *
 * Fetches the current conditions for a hardcoded location (Madrid by default,
 * overridable via env vars) from Open-Meteo with a 5s AbortController timeout.
 * On any failure (network, timeout, non-2xx) falls back to a hardcoded sample
 * payload so the example always produces a PNG.
 *
 * The custom block renders an inline `<svg>` weather icon next to the
 * temperature. SVG paths copied verbatim from
 *   ~/Dev/marplanner/apps/api/src/blocks/weather.tsx
 * (hand-drawn originals, no external icon-set attribution required).
 *
 * Run:   pnpm example:weather
 *        LAT=40.4 LON=-3.7 pnpm example:weather
 * Out:   ./output.png
 */
import { writeFile } from "node:fs/promises";
import {
  builtinBlocks,
  createRegistry,
  defineBlock,
  loadThemeFonts,
  render,
  themes,
} from "pressedslip";
// React must be in scope because tsx defaults to the classic JSX transform
// outside an explicit jsx-runtime tsconfig; this keeps the example portable.
import * as React from "react";
import { type ZodType, z } from "zod";

type Condition = "clear" | "clouds" | "rain" | "snow" | "storm";

type WeatherData = {
  tempC: number;
  condition: Condition;
  windKph: number;
  location: string;
};

const weatherSchema: ZodType<WeatherData> = z.object({
  tempC: z.number(),
  condition: z.enum(["clear", "clouds", "rain", "snow", "storm"]),
  windKph: z.number(),
  location: z.string(),
});

function WeatherIcon({ condition }: { condition: Condition }): React.JSX.Element {
  if (condition === "clear") {
    return (
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={14} fill="black" />
        <g stroke="black" strokeWidth={5} strokeLinecap="round">
          <line x1={36} y1={4} x2={36} y2={16} />
          <line x1={36} y1={56} x2={36} y2={68} />
          <line x1={4} y1={36} x2={16} y2={36} />
          <line x1={56} y1={36} x2={68} y2={36} />
          <line x1={13} y1={13} x2={21} y2={21} />
          <line x1={51} y1={51} x2={59} y2={59} />
          <line x1={13} y1={59} x2={21} y2={51} />
          <line x1={51} y1={21} x2={59} y2={13} />
        </g>
      </svg>
    );
  }
  if (condition === "rain" || condition === "storm") {
    return (
      <svg width={72} height={72} viewBox="0 0 72 72">
        <path
          d="M20 40h32c7 0 12-5 12-12s-5-12-12-12c-3-8-10-12-18-12-11 0-20 8-21 19C6 25 2 30 2 36C6 38 12 40 20 40z"
          fill="black"
        />
        <g stroke="black" strokeWidth={5} strokeLinecap="round">
          <line x1={24} y1={52} x2={18} y2={66} />
          <line x1={40} y1={52} x2={34} y2={66} />
          <line x1={56} y1={52} x2={50} y2={66} />
        </g>
      </svg>
    );
  }
  if (condition === "snow") {
    return (
      <svg width={72} height={72} viewBox="0 0 72 72">
        <path
          d="M20 38h32c7 0 12-5 12-12s-5-12-12-12c-3-8-10-12-18-12-11 0-20 8-21 19C6 23 2 28 2 34C6 36 12 38 20 38z"
          fill="black"
        />
        <g fill="black">
          <circle cx={22} cy={58} r={4} />
          <circle cx={38} cy={58} r={4} />
          <circle cx={54} cy={58} r={4} />
        </g>
      </svg>
    );
  }
  // "clouds" (and unknown) → plain cloud shape
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <path
        d="M20 46h32c7 0 12-5 12-12s-5-12-12-12c-3-8-10-12-18-12-11 0-20 8-21 19C6 31 2 36 2 42C6 44 12 46 20 46z"
        fill="black"
      />
    </svg>
  );
}

const weatherBlock = defineBlock({
  type: "weather",
  schema: weatherSchema,
  render: ({ data }) => (
    <div
      style={{
        width: "100%",
        padding: 12,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
      }}
    >
      <WeatherIcon condition={data.condition} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 48, fontWeight: 700 }}>{`${Math.round(data.tempC)}°C`}</div>
        <div
          style={{ fontSize: 16 }}
        >{`${data.location} · wind ${Math.round(data.windKph)} km/h`}</div>
      </div>
    </div>
  ),
  shell: { showTitle: true, separator: "thin", padding: "normal" },
});

// WMO weather codes → our 5 buckets. See https://open-meteo.com docs.
function wmoToCondition(code: number): Condition {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "clouds";
  if (code === 45 || code === 48) return "clouds";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
  if (code >= 95) return "storm";
  return "clouds";
}

const FALLBACK: WeatherData = {
  tempC: 20,
  condition: "clear",
  windKph: 5,
  location: "Sample (Madrid)",
};

async function fetchWeather(lat: number, lon: number, label: string): Promise<WeatherData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = (await resp.json()) as {
      current_weather?: { temperature: number; windspeed: number; weathercode: number };
    };
    const cw = json.current_weather;
    if (!cw) throw new Error("missing current_weather");
    return {
      tempC: cw.temperature,
      condition: wmoToCondition(cw.weathercode),
      windKph: cw.windspeed,
      location: label,
    };
  } catch (err) {
    console.warn(`[weather] fetch failed (${String(err)}); using fallback sample`);
    return FALLBACK;
  } finally {
    clearTimeout(timeoutId);
  }
}

const lat = Number(process.env.LAT ?? "40.4168");
const lon = Number(process.env.LON ?? "-3.7038");
const label = process.env.LOCATION ?? `${lat.toFixed(2)},${lon.toFixed(2)}`;

const data = await fetchWeather(lat, lon, label);

const registry = createRegistry([...builtinBlocks, weatherBlock]);
const theme = await loadThemeFonts(themes.default);

const today = new Date().toISOString().slice(0, 10);
const { bytes, failedBlocks } = await render(
  {
    id: `weather-${today}`,
    version: 1,
    date: today,
    status: "ready",
    slots: [{ index: 0, blockType: "weather", data, title: "Weather" }],
  },
  { registry, theme },
);

const outUrl = new URL("./output.png", import.meta.url);
await writeFile(outUrl, bytes);

if (failedBlocks.length > 0) {
  console.warn("[weather] failed blocks:", failedBlocks);
}
console.log(
  `[weather] wrote ${outUrl.pathname} (${data.condition} ${Math.round(data.tempC)}°C @ ${data.location})`,
);
