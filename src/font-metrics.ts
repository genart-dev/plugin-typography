/**
 * Font metric extraction using opentype.js.
 * Provides unified access to font-level and glyph-level measurements.
 */

import type { Font } from "opentype.js";

export interface FontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  xHeight: number;
  capHeight: number;
  lineGap: number;
  avgCharWidth: number;
}

export interface GlyphMetrics {
  advanceWidth: number;
  leftSideBearing: number;
  boundingBox: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * Extract font-level metrics from an opentype.js Font object.
 */
export function getMetrics(font: Font): FontMetrics {
  const unitsPerEm = font.unitsPerEm;
  const ascender = font.ascender;
  const descender = font.descender;

  // Extract OS/2 table metrics if available
  const os2 = (font.tables as Record<string, Record<string, number> | undefined>)["os2"];
  const xHeight = os2?.["sxHeight"] ?? estimateXHeight(font);
  const capHeight = os2?.["sCapHeight"] ?? estimateCapHeight(font);
  const lineGap = (font.tables as Record<string, Record<string, number> | undefined>)["hhea"]?.["lineGap"] ?? 0;

  // Compute average character width from lowercase alphabet
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let totalWidth = 0;
  let count = 0;
  for (const char of alphabet) {
    const glyph = font.charToGlyph(char);
    if (glyph && glyph.advanceWidth) {
      totalWidth += glyph.advanceWidth;
      count++;
    }
  }
  const avgCharWidth = count > 0 ? Math.round(totalWidth / count) : unitsPerEm / 2;

  return { unitsPerEm, ascender, descender, xHeight, capHeight, lineGap, avgCharWidth };
}

/**
 * Extract metrics for a specific glyph.
 */
export function getGlyphMetrics(font: Font, char: string): GlyphMetrics {
  const glyph = font.charToGlyph(char);
  const bbox = glyph.getBoundingBox();

  return {
    advanceWidth: glyph.advanceWidth ?? 0,
    leftSideBearing: glyph.leftSideBearing ?? bbox.x1,
    boundingBox: {
      x1: bbox.x1,
      y1: bbox.y1,
      x2: bbox.x2,
      y2: bbox.y2,
    },
  };
}

/** Estimate x-height from the 'x' glyph bounding box. */
function estimateXHeight(font: Font): number {
  const glyph = font.charToGlyph("x");
  if (!glyph) return Math.round(font.unitsPerEm * 0.5);
  const bbox = glyph.getBoundingBox();
  return bbox.y2 - bbox.y1;
}

/** Estimate cap height from the 'H' glyph bounding box. */
function estimateCapHeight(font: Font): number {
  const glyph = font.charToGlyph("H");
  if (!glyph) return Math.round(font.unitsPerEm * 0.7);
  const bbox = glyph.getBoundingBox();
  return bbox.y2 - bbox.y1;
}
