import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlockShell } from "../../../src/shell/BlockShell.js";
import { ShellBottom } from "../../../src/shell/ShellBottom.js";
import { ShellTop } from "../../../src/shell/ShellTop.js";

describe("ShellTop", () => {
  it("renders the date alone when subject is absent", () => {
    const html = renderToStaticMarkup(<ShellTop date="2026-05-19" />);
    expect(html).toContain("2026-05-19");
  });

  it("renders subject name + date when subject is present", () => {
    const html = renderToStaticMarkup(
      <ShellTop date="2026-05-19" subject={{ id: "u1", name: "Diego" }} />,
    );
    expect(html).toContain("Diego");
    expect(html).toContain("2026-05-19");
  });
});

describe("ShellBottom", () => {
  it("renders an empty placeholder", () => {
    const html = renderToStaticMarkup(<ShellBottom />);
    expect(html).toBeDefined();
  });
});

describe("BlockShell", () => {
  it("renders the title above the child when showTitle is true and title given", () => {
    const html = renderToStaticMarkup(
      <BlockShell title="WEATHER" options={{ showTitle: true }}>
        <div>content</div>
      </BlockShell>,
    );
    expect(html).toContain("WEATHER");
    expect(html).toContain("content");
  });

  it("omits title when showTitle is false", () => {
    const html = renderToStaticMarkup(
      <BlockShell title="WEATHER" options={{ showTitle: false }}>
        <div>content</div>
      </BlockShell>,
    );
    expect(html).not.toContain("WEATHER");
    expect(html).toContain("content");
  });

  it("omits title when title is undefined", () => {
    const html = renderToStaticMarkup(
      <BlockShell options={{ showTitle: true }}>
        <div>content</div>
      </BlockShell>,
    );
    expect(html).toContain("content");
  });

  it("renders a 1 px bar when separator is 'thin'", () => {
    const html = renderToStaticMarkup(
      <BlockShell title="X" options={{ showTitle: true, separator: "thin" }}>
        x
      </BlockShell>,
    );
    expect(html).toMatch(/height:1px/);
    // Separator color comes from SHELL_DEFAULTS.separatorColor (#000).
    expect(html).toMatch(/background-color:#000/);
  });

  it("renders no separator bar when separator is 'none', but keeps the placeholder slot", () => {
    const html = renderToStaticMarkup(
      <BlockShell title="X" options={{ showTitle: true, separator: "none" }}>
        x
      </BlockShell>,
    );
    // Negative: no separator bar.
    expect(html).not.toMatch(/height:1px|height:3px/);
    // The placeholder slot is still present — Satori needs
    // the flex-column slot even when empty. Confirm ≥3 display:flex divs.
    expect(html.match(/display:flex/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("omits font-family inline style when no titleFontRole is configured", () => {
    const html = renderToStaticMarkup(
      <BlockShell title="X" options={{ showTitle: true }}>
        x
      </BlockShell>,
    );
    // titleFontRole is resolved at satori-level, not injected as
    // inline font-family on the title strip. No inline font-family expected.
    expect(html).not.toMatch(/font-family:/);
  });
});
