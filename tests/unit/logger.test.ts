import { describe, expect, it, vi } from "vitest";
import { createConsoleLogger, noopLogger } from "../../src/logger.js";

describe("noopLogger", () => {
  it("has the 4 verbs and they all do nothing", () => {
    expect(() => {
      noopLogger.debug("x");
      noopLogger.info("x");
      noopLogger.warn("x");
      noopLogger.error("x");
      noopLogger.debug("x", { extra: "field" });
    }).not.toThrow();
  });
});

describe("createConsoleLogger", () => {
  it("routes each verb to the matching console method", () => {
    const log = createConsoleLogger();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    log.debug("d", { a: 1 });
    log.info("i", { a: 2 });
    log.warn("w");
    log.error("e", { a: 3 });

    expect(debugSpy).toHaveBeenCalledWith("d", { a: 1 });
    expect(infoSpy).toHaveBeenCalledWith("i", { a: 2 });
    expect(warnSpy).toHaveBeenCalledWith("w", undefined);
    expect(errorSpy).toHaveBeenCalledWith("e", { a: 3 });

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
