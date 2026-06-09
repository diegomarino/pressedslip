/**
 * @fileoverview Top toolbar: width selector + theme selector + GitHub link.
 * Width is playground-only state, not on DraftComposition.
 */

import { themes } from "pressedslip/browser";
import type { JSX } from "react";
import { type ThemeId, themeIds } from "../render-with-wasm.js";

const WIDTH_PRESETS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 384, label: "Thermal 58 (384px)" },
  { value: 576, label: "Thermal 80 (576px)" },
  { value: 832, label: "Receipt 112 (832px)" },
];

type ToolbarProps = {
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  isFontsLoading: boolean;
  width: number;
  onWidthChange: (next: number) => void;
};

export function Toolbar({
  themeId,
  onThemeChange,
  isFontsLoading,
  width,
  onWidthChange,
}: ToolbarProps): JSX.Element {
  return (
    <div className="toolbar">
      <div className="toolbar-title">pressedslip · playground</div>
      <label className="toolbar-control">
        Width:
        <select
          value={width}
          onChange={(e) => onWidthChange(Number.parseInt(e.target.value, 10))}
          aria-label="Width selector"
        >
          {WIDTH_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="toolbar-control">
        Theme:
        <select
          value={themeId}
          onChange={(e) => onThemeChange(e.target.value as ThemeId)}
          aria-label="Theme selector"
        >
          {themeIds.map((id) => (
            <option key={id} value={id}>
              {themes[id].label}
            </option>
          ))}
        </select>
        {isFontsLoading ? <span className="toolbar-loading">loading fonts…</span> : null}
      </label>
      <a
        className="toolbar-link"
        href="https://github.com/diegomarino/pressedslip"
        target="_blank"
        rel="noreferrer"
      >
        GitHub ↗
      </a>
    </div>
  );
}
