/**
 * @fileoverview Receipt header: subject name + date + bottom rule.
 * Reads from `theme` prop (NOT React Context).
 */
import type { ReactElement } from "react";
import { HEADER_DEFAULTS } from "../themes/apply-defaults.js";
import type { HeaderTheme } from "../themes/types.js";
import type { Subject } from "../types.js";

/** Props accepted by the ShellTop header component. */
export type ShellTopProps = {
  date: string;
  subject?: Subject;
  theme?: Required<HeaderTheme>;
};

/**
 * Render the composition header using theme.header defaults (or package
 * defaults when theme is undefined). Visible structure unchanged: subject
 * name large + bold, date smaller, configurable bottom rule.
 */
export function ShellTop({ date, subject, theme }: ShellTopProps): ReactElement {
  const t = theme ?? HEADER_DEFAULTS;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backgroundColor: "#fff",
        color: "#000",
        padding: `${t.padding}px`,
      }}
    >
      {subject ? (
        <div style={{ fontSize: t.nameFontSize, fontWeight: t.nameFontWeight }}>{subject.name}</div>
      ) : (
        <div style={{ display: "flex" }} />
      )}
      <div style={{ fontSize: t.dateFontSize, fontWeight: t.dateFontWeight }}>{date}</div>
      <div
        style={{
          marginTop: 12,
          height: t.bottomRuleHeight,
          backgroundColor: t.bottomRuleColor,
          width: "100%",
        }}
      />
    </div>
  );
}
