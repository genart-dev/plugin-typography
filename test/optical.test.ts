import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import opentype from "opentype.js";
import {
  classifyGlyph,
  classifyText,
  applyOvershoot,
  DEFAULT_OPTICAL_RULES,
  type PositionedGlyph,
} from "../src/optical.js";

const FONT_PATH = resolve(__dirname, "../fonts/Inter-Variable.ttf");
const fontBuffer = readFileSync(FONT_PATH);
const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

describe("optical", () => {
  describe("classifyGlyph", () => {
    it("classifies flat-topped letters correctly", () => {
      for (const char of ["H", "E", "F", "T", "L", "I"]) {
        expect(classifyGlyph(font, char)).toBe("flat");
      }
    });

    it("classifies round letters correctly", () => {
      for (const char of ["O", "C", "G", "S"]) {
        expect(classifyGlyph(font, char)).toBe("round");
      }
    });

    it("classifies pointed letters correctly", () => {
      for (const char of ["A", "V", "W"]) {
        expect(classifyGlyph(font, char)).toBe("pointed");
      }
    });

    it("classifies mixed letters correctly", () => {
      expect(classifyGlyph(font, "B")).toBe("mixed");
    });

    it("classifies lowercase round letters", () => {
      for (const char of ["o", "c", "e", "s"]) {
        expect(classifyGlyph(font, char)).toBe("round");
      }
    });

    it("returns a valid shape for any character", () => {
      const validShapes = ["flat", "round", "pointed", "mixed"];
      for (const char of "0123456789!@#$%") {
        expect(validShapes).toContain(classifyGlyph(font, char));
      }
    });
  });

  describe("classifyText", () => {
    it("returns array of classifications matching text length", () => {
      const result = classifyText(font, "HOVA");
      expect(result).toHaveLength(4);
      expect(result[0]).toBe("flat");    // H
      expect(result[1]).toBe("round");   // O
      expect(result[2]).toBe("pointed"); // V
      expect(result[3]).toBe("pointed"); // A
    });

    it("handles empty string", () => {
      expect(classifyText(font, "")).toEqual([]);
    });
  });

  describe("applyOvershoot", () => {
    const capHeight = 1456; // Inter's approx cap height

    function makeGlyphs(text: string): PositionedGlyph[] {
      return Array.from(text).map((char, i) => ({
        char,
        x: i * 100,
        y: 0,
        advanceWidth: 100,
      }));
    }

    it("does not adjust flat glyphs", () => {
      const glyphs = makeGlyphs("H");
      const result = applyOvershoot(glyphs, font, capHeight);
      expect(result[0]!.y).toBe(0);
    });

    it("adjusts round glyphs downward (positive y offset)", () => {
      const glyphs = makeGlyphs("O");
      const result = applyOvershoot(glyphs, font, capHeight);
      expect(result[0]!.y).toBeGreaterThan(0);
      expect(result[0]!.y).toBeCloseTo(capHeight * DEFAULT_OPTICAL_RULES.roundOvershoot, 1);
    });

    it("adjusts pointed glyphs more than round glyphs", () => {
      const oGlyphs = makeGlyphs("O");
      const aGlyphs = makeGlyphs("A");
      const oResult = applyOvershoot(oGlyphs, font, capHeight);
      const aResult = applyOvershoot(aGlyphs, font, capHeight);
      expect(aResult[0]!.y).toBeGreaterThan(oResult[0]!.y);
    });

    it("applies half overshoot to mixed glyphs", () => {
      const glyphs = makeGlyphs("B");
      const result = applyOvershoot(glyphs, font, capHeight);
      const expected = capHeight * DEFAULT_OPTICAL_RULES.roundOvershoot * 0.5;
      expect(result[0]!.y).toBeCloseTo(expected, 1);
    });

    it("preserves x positions and advance widths", () => {
      const glyphs = makeGlyphs("HOVA");
      const result = applyOvershoot(glyphs, font, capHeight);
      for (let i = 0; i < glyphs.length; i++) {
        expect(result[i]!.x).toBe(glyphs[i]!.x);
        expect(result[i]!.advanceWidth).toBe(glyphs[i]!.advanceWidth);
      }
    });

    it("accepts custom optical rules", () => {
      const glyphs = makeGlyphs("O");
      const customRules = { roundOvershoot: 0.1, pointedOvershoot: 0.15, crossbarOffset: 0.05 };
      const result = applyOvershoot(glyphs, font, capHeight, customRules);
      expect(result[0]!.y).toBeCloseTo(capHeight * 0.1, 1);
    });
  });
});
