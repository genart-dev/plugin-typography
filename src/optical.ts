/**
 * Optical alignment engine.
 * Codifies professional typography rules for overshoot, crossbar offset,
 * and glyph classification.
 */

import type { Font } from "opentype.js";
import { getGlyphMetrics } from "./font-metrics.js";

export type GlyphShape = "flat" | "round" | "pointed" | "mixed";

export interface OpticalRules {
  roundOvershoot: number;
  pointedOvershoot: number;
  crossbarOffset: number;
}

export const DEFAULT_OPTICAL_RULES: OpticalRules = {
  roundOvershoot: 0.03,
  pointedOvershoot: 0.05,
  crossbarOffset: 0.025,
};

/**
 * Known glyph classifications for common Latin characters.
 * Used as fast lookup before falling back to heuristic analysis.
 */
const KNOWN_CLASSIFICATIONS: Record<string, GlyphShape> = {
  // Flat top and bottom
  H: "flat", E: "flat", F: "flat", T: "flat", L: "flat", I: "flat",
  D: "flat", K: "flat", P: "flat", R: "flat", U: "flat", Z: "flat", X: "flat",
  h: "flat", l: "flat", i: "flat", k: "flat", t: "flat", d: "flat",
  f: "flat", r: "flat", n: "flat", u: "flat", x: "flat", z: "flat",
  // Round — curves beyond baseline/cap
  O: "round", C: "round", G: "round", Q: "round", S: "round",
  o: "round", c: "round", e: "round", s: "round", a: "round",
  // Pointed — vertex exceeds baseline/cap
  A: "pointed", V: "pointed", W: "pointed", M: "pointed", N: "pointed",
  v: "pointed", w: "pointed", y: "pointed",
  // Mixed
  B: "mixed", J: "mixed", b: "mixed", g: "mixed", j: "mixed", p: "mixed", q: "mixed",
};

/**
 * Classify a glyph's shape by analyzing its bounding box relative to font metrics.
 */
export function classifyGlyph(font: Font, char: string): GlyphShape {
  // Fast lookup for known characters
  const known = KNOWN_CLASSIFICATIONS[char];
  if (known) return known;

  // Heuristic classification from bounding box
  const metrics = getGlyphMetrics(font, char);
  const bbox = metrics.boundingBox;

  // If the bounding box is empty, treat as flat
  if (bbox.x1 === 0 && bbox.y1 === 0 && bbox.x2 === 0 && bbox.y2 === 0) {
    return "flat";
  }

  const ascender = font.ascender;
  const threshold = font.unitsPerEm * 0.02;

  // Check if glyph extends beyond expected boundaries
  const exceedsTop = bbox.y2 > ascender + threshold;
  const exceedsBaseline = bbox.y1 < -threshold;

  if (exceedsTop || exceedsBaseline) {
    // Determine if the extension is a curve or point
    const glyphWidth = bbox.x2 - bbox.x1;
    const glyphHeight = bbox.y2 - bbox.y1;

    // Pointed glyphs tend to be taller relative to their width
    if (glyphHeight > glyphWidth * 1.3) return "pointed";
    return "round";
  }

  return "flat";
}

export interface PositionedGlyph {
  char: string;
  x: number;
  y: number;
  advanceWidth: number;
}

/**
 * Apply overshoot adjustments to positioned glyphs.
 * Round glyphs extend slightly beyond the baseline/cap height,
 * pointed glyphs extend even more.
 */
export function applyOvershoot(
  glyphs: PositionedGlyph[],
  font: Font,
  capHeight: number,
  rules: OpticalRules = DEFAULT_OPTICAL_RULES,
): PositionedGlyph[] {
  return glyphs.map((g) => {
    const shape = classifyGlyph(font, g.char);

    switch (shape) {
      case "round":
        return { ...g, y: g.y + capHeight * rules.roundOvershoot };
      case "pointed":
        return { ...g, y: g.y + capHeight * rules.pointedOvershoot };
      case "mixed":
        return { ...g, y: g.y + capHeight * rules.roundOvershoot * 0.5 };
      default:
        return g;
    }
  });
}

/**
 * Classify all characters in a text string.
 */
export function classifyText(font: Font, text: string): GlyphShape[] {
  return Array.from(text).map((char) => classifyGlyph(font, char));
}
