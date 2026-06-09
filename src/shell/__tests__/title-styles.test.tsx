/**
 * @fileoverview Component tests for the 3 title strip styles.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHELL_DEFAULTS } from "../../themes/apply-defaults.js";
import { BlockShell } from "../BlockShell.js";

describe("BlockShell title styles", () => {
  it("renders inverted block bar when titleStyle is 'block'", () => {
    const html = renderToStaticMarkup(
      <BlockShell
        title="X"
        options={{ showTitle: true }}
        theme={{ ...SHELL_DEFAULTS, titleStyle: "block" }}
      >
        x
      </BlockShell>,
    );
    expect(html).toMatch(/background-color:#000/);
    expect(html).toMatch(/color:#fff/);
  });

  it("renders text-on-white with fill characters when titleStyle is 'hash'", () => {
    const html = renderToStaticMarkup(
      <BlockShell
        title="X"
        options={{ showTitle: true }}
        theme={{ ...SHELL_DEFAULTS, titleStyle: "hash", titleFillChar: "#" }}
      >
        x
      </BlockShell>,
    );
    expect(html).toMatch(/# # # /);
    expect(html).toMatch(/color:#000/);
  });

  it("renders plain text without inversion when titleStyle is 'plain'", () => {
    const html = renderToStaticMarkup(
      <BlockShell
        title="X"
        options={{ showTitle: true }}
        theme={{ ...SHELL_DEFAULTS, titleStyle: "plain" }}
      >
        x
      </BlockShell>,
    );
    expect(html).toMatch(/background-color:#fff/);
    // Must NOT have white text (inverted colors). Use ";" prefix to exclude
    // false positive from "background-color:#fff" where "color:#fff" is a substring.
    expect(html).not.toMatch(/;color:#fff/);
  });
});
