# Weather

Live weather render with graceful fallback. Fetches current conditions from
[Open-Meteo](https://open-meteo.com) for a hardcoded location (Madrid by
default), maps the WMO weather code to one of five visual conditions
(`clear`, `clouds`, `rain`, `snow`, `storm`), and renders through a custom
block with an inline SVG icon.

**Block**: custom `weather` (defined in-file). Inline `<svg>` icon next to
temperature.
**Generator**: Open-Meteo `/v1/forecast` with `current_weather=true`. 5s
`AbortController` timeout; single attempt; on failure (network, timeout,
non-2xx) falls back to a hardcoded sample so the example always renders.
**Theme**: pressedslip default. No overrides.

## Run (Node)

```sh
pnpm example:weather                     # default: Madrid (40.4168, -3.7038)
LAT=51.5074 LON=-0.1278 pnpm example:weather   # any lat/lon
LOCATION=London LAT=51.5074 LON=-0.1278 pnpm example:weather
```

Writes `examples/weather/output.png` (gitignored).

## Run (browser)

Open `examples/weather/example.html` in any modern browser. The PNG renders
automatically on page load (default: Madrid). Edit the lat/lon inputs to
re-render for a different location — debounced so it fires once you stop
typing. The browser version uses `React.createElement` directly so it ships
with no build step.

## SVG icon source

The five condition icons (`clear`, `clouds`, `rain`/`storm`, `snow`) are
copied verbatim from `~/Dev/marplanner/apps/api/src/blocks/weather.tsx`.
Hand-drawn originals, no external icon-set attribution required.

## What this teaches

- Live API integration with timeout + graceful fallback (the example always
  produces output, even offline).
- Inline `<svg>` inside a block render — Satori serializes `<svg>` elements
  natively; `<img>` tags are NOT supported, so all imagery must be inline
  SVG or data-URI.
- WMO weather code → visual condition mapping done inside the example's
  generator function; the block only sees the simplified shape.
- Sharing one block definition between the Node `.tsx` (JSX) and the browser
  `.html` (`React.createElement`).
