import { describe, expect, it } from "vitest";
import { rgbaToOneBit } from "../../../src/pipeline/one-bit.js";

describe("rgbaToOneBit", () => {
  it("throws if width is not divisible by 8", () => {
    const rgba = new Uint8Array(7 * 1 * 4);
    expect(() => rgbaToOneBit(rgba, 7, 1, 128)).toThrow(/divisible by 8/i);
  });

  it("packs 8 black pixels into byte 0xFF (MSB-first)", () => {
    const rgba = new Uint8Array(8 * 1 * 4);
    for (let i = 0; i < 8 * 4; i += 4) {
      rgba[i] = 0;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      rgba[i + 3] = 255;
    }
    const out = rgbaToOneBit(rgba, 8, 1, 128);
    expect(out.length).toBe(1);
    expect(out[0]).toBe(0xff);
  });

  it("packs 8 white pixels into byte 0x00", () => {
    const rgba = new Uint8Array(8 * 1 * 4);
    for (let i = 0; i < 8 * 4; i += 4) {
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }
    const out = rgbaToOneBit(rgba, 8, 1, 128);
    expect(out.length).toBe(1);
    expect(out[0]).toBe(0x00);
  });

  it("threshold at 128 → exactly 128 is black", () => {
    const rgba = new Uint8Array(8 * 4);
    rgba.fill(128);
    rgba[3] = 255;
    for (let i = 4; i < 32; i += 4) {
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }
    const out = rgbaToOneBit(rgba, 8, 1, 128);
    expect(out[0]).toBe(0x80);
  });

  it("threshold respects parameter (200)", () => {
    const rgba = new Uint8Array(8 * 4);
    rgba.fill(150);
    for (let i = 3; i < 32; i += 4) rgba[i] = 255;
    const out = rgbaToOneBit(rgba, 8, 1, 200);
    expect(out[0]).toBe(0xff);
  });

  it("multi-row output is row-major and contiguous", () => {
    const rgba = new Uint8Array(16 * 2 * 4);
    for (let i = 0; i < 16 * 4; i += 4) {
      rgba[i] = 0;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      rgba[i + 3] = 255;
    }
    for (let i = 16 * 4; i < 32 * 4; i += 4) {
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }
    const out = rgbaToOneBit(rgba, 16, 2, 128);
    expect(out.length).toBe(2 * 2);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xff);
    expect(out[2]).toBe(0x00);
    expect(out[3]).toBe(0x00);
  });
});
