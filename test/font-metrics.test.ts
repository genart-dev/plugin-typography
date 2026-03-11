import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import opentype from "opentype.js";
import { getMetrics, getGlyphMetrics } from "../src/font-metrics.js";

const FONT_PATH = resolve(__dirname, "../fonts/Inter-Variable.ttf");
const fontBuffer = readFileSync(FONT_PATH);
const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

describe("font-metrics", () => {
  describe("getMetrics", () => {
    it("returns valid font-level metrics", () => {
      const metrics = getMetrics(font);

      expect(metrics.unitsPerEm).toBe(2048);
      expect(metrics.ascender).toBeGreaterThan(0);
      expect(metrics.descender).toBeLessThan(0);
      expect(metrics.xHeight).toBeGreaterThan(0);
      expect(metrics.capHeight).toBeGreaterThan(0);
      expect(metrics.avgCharWidth).toBeGreaterThan(0);
    });

    it("xHeight is less than capHeight", () => {
      const metrics = getMetrics(font);
      expect(metrics.xHeight).toBeLessThan(metrics.capHeight);
    });

    it("ascender is greater than capHeight", () => {
      const metrics = getMetrics(font);
      expect(metrics.ascender).toBeGreaterThanOrEqual(metrics.capHeight);
    });

    it("lineGap is a non-negative number", () => {
      const metrics = getMetrics(font);
      expect(metrics.lineGap).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getGlyphMetrics", () => {
    it("returns metrics for letter 'A'", () => {
      const metrics = getGlyphMetrics(font, "A");

      expect(metrics.advanceWidth).toBeGreaterThan(0);
      expect(metrics.boundingBox.x2).toBeGreaterThan(metrics.boundingBox.x1);
      expect(metrics.boundingBox.y2).toBeGreaterThan(metrics.boundingBox.y1);
    });

    it("returns metrics for space character", () => {
      const metrics = getGlyphMetrics(font, " ");
      expect(metrics.advanceWidth).toBeGreaterThan(0);
    });

    it("'W' is wider than 'i'", () => {
      const wMetrics = getGlyphMetrics(font, "W");
      const iMetrics = getGlyphMetrics(font, "i");
      expect(wMetrics.advanceWidth).toBeGreaterThan(iMetrics.advanceWidth);
    });

    it("'M' has positive leftSideBearing", () => {
      const metrics = getGlyphMetrics(font, "M");
      expect(metrics.leftSideBearing).toBeGreaterThanOrEqual(0);
    });
  });
});
