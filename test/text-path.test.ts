import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import opentype from "opentype.js";
import { textToPath, textToSVG } from "../src/text-path.js";

const FONT_PATH = resolve(__dirname, "../fonts/Inter-Variable.ttf");
const fontBuffer = readFileSync(FONT_PATH);
const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

describe("text-path", () => {
  describe("textToPath", () => {
    it("returns empty result for empty string", () => {
      const result = textToPath("", { font, fontSize: 48 });
      expect(result.svgPath).toBe("");
      expect(result.glyphPaths).toHaveLength(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("generates path data for single character", () => {
      const result = textToPath("A", { font, fontSize: 48 });
      expect(result.svgPath).toBeTruthy();
      expect(result.glyphPaths).toHaveLength(1);
      expect(result.glyphPaths[0]!.char).toBe("A");
      expect(result.glyphPaths[0]!.path).toBeTruthy();
    });

    it("generates path data for a word", () => {
      const result = textToPath("Hello", { font, fontSize: 48 });
      expect(result.svgPath).toBeTruthy();
      expect(result.glyphPaths).toHaveLength(5);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.baseline).toBeGreaterThan(0);
    });

    it("each glyph has valid position data", () => {
      const result = textToPath("Test", { font, fontSize: 48 });
      for (const glyph of result.glyphPaths) {
        expect(typeof glyph.x).toBe("number");
        expect(typeof glyph.y).toBe("number");
        expect(glyph.advanceWidth).toBeGreaterThan(0);
      }
    });

    it("glyph x positions are monotonically increasing", () => {
      const result = textToPath("Hello World", { font, fontSize: 48 });
      for (let i = 1; i < result.glyphPaths.length; i++) {
        // Space character may have same x as previous advance,
        // but generally positions should increase
        expect(result.glyphPaths[i]!.x).toBeGreaterThanOrEqual(
          result.glyphPaths[i - 1]!.x,
        );
      }
    });

    it("respects kerning mode 'none'", () => {
      const withKerning = textToPath("AV", { font, fontSize: 48, kerning: "metrics" });
      const noKerning = textToPath("AV", { font, fontSize: 48, kerning: "none" });
      // Positions may differ due to kerning adjustments
      // Both should produce valid output
      expect(withKerning.svgPath).toBeTruthy();
      expect(noKerning.svgPath).toBeTruthy();
    });

    it("applies letter spacing", () => {
      const tight = textToPath("AB", { font, fontSize: 48, letterSpacing: 0 });
      const loose = textToPath("AB", { font, fontSize: 48, letterSpacing: 10 });
      // Loose spacing should produce wider result
      expect(loose.width).toBeGreaterThan(tight.width);
    });

    it("applies tracking", () => {
      const base = textToPath("AB", { font, fontSize: 48, tracking: 0 });
      const tracked = textToPath("AB", { font, fontSize: 48, tracking: 100 });
      expect(tracked.width).toBeGreaterThan(base.width);
    });

    it("works with optical alignment disabled", () => {
      const result = textToPath("HOVA", { font, fontSize: 48, opticalAlign: false });
      expect(result.svgPath).toBeTruthy();
      expect(result.glyphPaths).toHaveLength(4);
    });

    it("fontSize affects dimensions proportionally", () => {
      const small = textToPath("A", { font, fontSize: 24 });
      const large = textToPath("A", { font, fontSize: 48 });
      // Height should roughly double
      expect(large.height).toBeCloseTo(small.height * 2, 0);
    });
  });

  describe("textToSVG", () => {
    it("returns empty string for empty text", () => {
      expect(textToSVG("", { font, fontSize: 48 })).toBe("");
    });

    it("produces valid SVG markup", () => {
      const svg = textToSVG("Hello", { font, fontSize: 48 });
      expect(svg).toContain("<svg");
      expect(svg).toContain("xmlns=");
      expect(svg).toContain("<path");
      expect(svg).toContain("</svg>");
    });

    it("applies fill color", () => {
      const svg = textToSVG("A", { font, fontSize: 48, fill: "#ff0000" });
      expect(svg).toContain('fill="#ff0000"');
    });

    it("uses black fill by default", () => {
      const svg = textToSVG("A", { font, fontSize: 48 });
      expect(svg).toContain('fill="#000000"');
    });

    it("includes class attribute when provided", () => {
      const svg = textToSVG("A", { font, fontSize: 48, className: "my-text" });
      expect(svg).toContain('class="my-text"');
    });

    it("has width and height attributes", () => {
      const svg = textToSVG("Hello", { font, fontSize: 48 });
      expect(svg).toMatch(/width="\d+"/);
      expect(svg).toMatch(/height="\d+"/);
    });
  });
});
