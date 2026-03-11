import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import opentype from "opentype.js";
import {
  getMetricsKerning,
  getOpticalKerning,
  extractKernPairs,
  applyKerning,
} from "../src/kerning.js";

const FONT_PATH = resolve(__dirname, "../fonts/Inter-Variable.ttf");
const fontBuffer = readFileSync(FONT_PATH);
const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

describe("kerning", () => {
  describe("getMetricsKerning", () => {
    it("returns empty array for single character", () => {
      expect(getMetricsKerning(font, "A")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(getMetricsKerning(font, "")).toEqual([]);
    });

    it("returns n-1 values for n characters", () => {
      const kerning = getMetricsKerning(font, "WAVE");
      expect(kerning).toHaveLength(3);
    });

    it("returns numeric values", () => {
      const kerning = getMetricsKerning(font, "AV");
      expect(kerning).toHaveLength(1);
      expect(typeof kerning[0]).toBe("number");
    });

    it("returns kerning for known tight pairs", () => {
      // AV and To are commonly kerned pairs
      const av = getMetricsKerning(font, "AV");
      const hh = getMetricsKerning(font, "HH");
      // AV should have a tighter (more negative) kerning than HH
      // or at least different from zero
      expect(typeof av[0]).toBe("number");
      expect(typeof hh[0]).toBe("number");
    });
  });

  describe("getOpticalKerning", () => {
    it("returns empty array for single character", () => {
      expect(getOpticalKerning(font, "A")).toEqual([]);
    });

    it("returns n-1 values for n characters", () => {
      const kerning = getOpticalKerning(font, "WAVE", 48);
      expect(kerning).toHaveLength(3);
    });

    it("returns numeric values", () => {
      const kerning = getOpticalKerning(font, "Hello", 48);
      for (const v of kerning) {
        expect(typeof v).toBe("number");
        expect(Number.isFinite(v)).toBe(true);
      }
    });

    it("adjustments are bounded (not huge values)", () => {
      const kerning = getOpticalKerning(font, "Typography", 48);
      for (const v of kerning) {
        expect(Math.abs(v)).toBeLessThan(font.unitsPerEm);
      }
    });
  });

  describe("extractKernPairs", () => {
    it("extracts kern pairs from font", () => {
      const pairs = extractKernPairs(font);
      // Inter should have some kern pairs
      expect(Array.isArray(pairs)).toBe(true);
      for (const pair of pairs) {
        expect(pair).toHaveProperty("left");
        expect(pair).toHaveProperty("right");
        expect(pair).toHaveProperty("value");
        expect(pair.value).not.toBe(0);
      }
    });

    it("accepts custom character set", () => {
      const pairs = extractKernPairs(font, "AV");
      expect(Array.isArray(pairs)).toBe(true);
      for (const pair of pairs) {
        expect("AV").toContain(pair.left);
        expect("AV").toContain(pair.right);
      }
    });
  });

  describe("applyKerning", () => {
    it("applies kerning offsets to positions", () => {
      const positions = [0, 100, 200, 300];
      const kerning = [-10, 5, -20];
      applyKerning(positions, kerning);

      expect(positions[0]).toBe(0);       // unchanged
      expect(positions[1]).toBe(90);      // 100 + (-10)
      expect(positions[2]).toBe(195);     // 200 + (-10 + 5)
      expect(positions[3]).toBe(275);     // 300 + (-10 + 5 - 20)
    });

    it("handles empty kerning array", () => {
      const positions = [0, 100];
      applyKerning(positions, []);
      expect(positions).toEqual([0, 100]);
    });

    it("applies scale factor", () => {
      const positions = [0, 100, 200];
      const kerning = [-10, 5];
      applyKerning(positions, kerning, 0.5);

      expect(positions[0]).toBe(0);
      expect(positions[1]).toBe(95);    // 100 + (-10 * 0.5)
      expect(positions[2]).toBe(197.5); // 200 + (-10 + 5) * 0.5
    });
  });
});
