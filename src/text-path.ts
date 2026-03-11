/**
 * Text-to-SVG-path conversion pipeline.
 * Composes font-loader, kerning, and optical modules to produce
 * SVG <path> elements from text strings.
 */

import type { Font, Path } from "opentype.js";
import { getMetrics } from "./font-metrics.js";
import { getMetricsKerning, getOpticalKerning, applyKerning } from "./kerning.js";
import { applyOvershoot, DEFAULT_OPTICAL_RULES, type OpticalRules, type PositionedGlyph } from "./optical.js";

export interface TextPathOptions {
  font: Font;
  fontSize: number;
  kerning?: "metrics" | "optical" | "none";
  opticalAlign?: boolean;
  letterSpacing?: number;
  tracking?: number;
}

export interface TextPathResult {
  svgPath: string;
  glyphPaths: GlyphPathResult[];
  width: number;
  height: number;
  baseline: number;
}

export interface GlyphPathResult {
  char: string;
  path: string;
  x: number;
  y: number;
  advanceWidth: number;
}

/**
 * Convert a text string to SVG path data.
 * This is the main integration point for text-to-path rendering.
 */
export function textToPath(text: string, options: TextPathOptions): TextPathResult {
  const {
    font,
    fontSize,
    kerning = "metrics",
    opticalAlign = true,
    letterSpacing = 0,
    tracking = 0,
  } = options;

  if (!text) {
    return { svgPath: "", glyphPaths: [], width: 0, height: 0, baseline: 0 };
  }

  const scale = fontSize / font.unitsPerEm;
  const metrics = getMetrics(font);

  // 1. Compute base glyph positions
  const glyphs: PositionedGlyph[] = [];
  let x = 0;

  for (const char of text) {
    const glyph = font.charToGlyph(char);
    const advance = glyph.advanceWidth ?? 0;
    glyphs.push({ char, x, y: 0, advanceWidth: advance * scale });
    x += advance;
  }

  // 2. Apply kerning
  if (kerning !== "none" && glyphs.length > 1) {
    const positions = glyphs.map((g) => g.x);
    const kernValues =
      kerning === "optical"
        ? getOpticalKerning(font, text, fontSize)
        : getMetricsKerning(font, text);
    applyKerning(positions, kernValues);
    for (let i = 0; i < glyphs.length; i++) {
      glyphs[i]!.x = positions[i]!;
    }
  }

  // 3. Apply letter-spacing and tracking
  const trackingUnits = tracking / scale; // tracking is in em units, convert to font units
  for (let i = 1; i < glyphs.length; i++) {
    const spacingOffset = (letterSpacing / scale + trackingUnits) * i;
    glyphs[i]!.x += spacingOffset;
  }

  // 4. Apply optical alignment
  let positioned = glyphs;
  if (opticalAlign) {
    positioned = applyOvershoot(glyphs, font, metrics.capHeight, DEFAULT_OPTICAL_RULES);
  }

  // 5. Generate SVG paths
  const glyphPaths: GlyphPathResult[] = [];
  let combinedPath = "";
  const baseline = metrics.ascender * scale;

  for (const glyph of positioned) {
    const glyphX = glyph.x * scale;
    const glyphY = baseline + glyph.y * scale;
    const path: Path = font.getPath(glyph.char, glyphX, glyphY, fontSize);
    const pathData = path.toPathData(2);

    glyphPaths.push({
      char: glyph.char,
      path: pathData,
      x: glyphX,
      y: glyphY,
      advanceWidth: glyph.advanceWidth,
    });

    if (pathData) {
      combinedPath += pathData + " ";
    }
  }

  // Compute total dimensions
  const lastGlyph = positioned[positioned.length - 1];
  const totalWidth = lastGlyph
    ? (lastGlyph.x + (lastGlyph.advanceWidth / scale)) * scale
    : 0;
  const totalHeight = (metrics.ascender - metrics.descender) * scale;

  return {
    svgPath: combinedPath.trim(),
    glyphPaths,
    width: totalWidth,
    height: totalHeight,
    baseline,
  };
}

/**
 * Convert text to a complete SVG string.
 */
export function textToSVG(
  text: string,
  options: TextPathOptions & { fill?: string; className?: string },
): string {
  const { fill = "#000000", className, ...pathOptions } = options;
  const result = textToPath(text, pathOptions);

  if (!result.svgPath) return "";

  const classAttr = className ? ` class="${className}"` : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(result.width)}" height="${Math.ceil(result.height)}" viewBox="0 0 ${Math.ceil(result.width)} ${Math.ceil(result.height)}"${classAttr}>` +
    `<path d="${result.svgPath}" fill="${fill}"/>` +
    `</svg>`
  );
}
