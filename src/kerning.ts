/**
 * Kerning engine.
 * Extracts kern pairs from font tables (metrics kerning) and provides
 * an algorithmic optical kerning alternative.
 */

import type { Font } from "opentype.js";
import { getGlyphMetrics } from "./font-metrics.js";

export interface KernPair {
  left: string;
  right: string;
  value: number;
}

/**
 * Get metrics-based kerning values from font kern/GPOS tables.
 * Returns an array of kerning adjustments for each consecutive pair.
 * Length = text.length - 1.
 */
export function getMetricsKerning(font: Font, text: string): number[] {
  if (text.length < 2) return [];

  const kerning: number[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    const left = font.charToGlyph(text[i]!);
    const right = font.charToGlyph(text[i + 1]!);
    const value = font.getKerningValue(left, right);
    kerning.push(value);
  }

  return kerning;
}

/**
 * Get optical kerning values by equalizing whitespace area between glyphs.
 * This approximates what professional optical kerning does by analyzing
 * the sidebearings and bounding boxes of adjacent glyphs.
 * Returns an array of adjustments for each consecutive pair.
 */
export function getOpticalKerning(font: Font, text: string, fontSize: number = 1000): number[] {
  if (text.length < 2) return [];

  const scale = fontSize / font.unitsPerEm;

  // Compute "optical gap" for each pair — the perceived whitespace
  // between the right edge of left glyph and left edge of right glyph
  const gaps: number[] = [];

  for (let i = 0; i < text.length - 1; i++) {
    const leftMetrics = getGlyphMetrics(font, text[i]!);
    const rightMetrics = getGlyphMetrics(font, text[i + 1]!);

    // Gap = (advanceWidth - rightEdge of bbox) + leftSideBearing of next glyph
    const rightBearing = leftMetrics.advanceWidth - leftMetrics.boundingBox.x2;
    const leftBearing = rightMetrics.boundingBox.x1;
    const gap = (rightBearing + leftBearing) * scale;
    gaps.push(gap);
  }

  if (gaps.length === 0) return [];

  // Target: average optical gap across all pairs
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

  // Adjustments to equalize gaps (in font units, convert back)
  return gaps.map((gap) => {
    const adjustment = (avgGap - gap) / scale;
    // Round to avoid sub-pixel noise
    return Math.round(adjustment);
  });
}

/**
 * Extract all kern pairs from a font (for analysis/display).
 * Limited to common Latin pairs by default.
 */
export function extractKernPairs(font: Font, chars?: string): KernPair[] {
  const charset = chars ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?-";
  const pairs: KernPair[] = [];

  for (const left of charset) {
    for (const right of charset) {
      const leftGlyph = font.charToGlyph(left);
      const rightGlyph = font.charToGlyph(right);
      const value = font.getKerningValue(leftGlyph, rightGlyph);
      if (value !== 0) {
        pairs.push({ left, right, value });
      }
    }
  }

  return pairs;
}

/**
 * Apply kerning adjustments to an array of glyph x-positions.
 * Mutates the positions array in-place and returns it.
 */
export function applyKerning(
  positions: number[],
  kerning: number[],
  scale: number = 1,
): number[] {
  let offset = 0;
  for (let i = 1; i < positions.length; i++) {
    const kern = kerning[i - 1] ?? 0;
    offset += kern * scale;
    positions[i]! += offset;
  }
  return positions;
}
