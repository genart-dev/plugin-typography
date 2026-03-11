/**
 * SVG text renderer.
 * When a font is available via opentype.js and renderMode is "path" or "auto",
 * renders text as SVG <path> elements for font-independent output.
 * Falls back to <text> elements when font data isn't available.
 */

import type { LayerProperties, LayerBounds } from "@genart-dev/core";
import { getFont } from "./font-loader.js";
import { textToPath } from "./text-path.js";

/**
 * Render text layer properties as SVG markup.
 * Uses path-based rendering when a loaded font is available and renderMode allows it.
 * Falls back to standard <text> element otherwise.
 */
export function renderTextSVG(
  properties: LayerProperties,
  bounds: LayerBounds,
): string {
  const text = (properties.text as string) ?? "";
  if (!text) return "";

  const fontSize = (properties.fontSize as number) ?? 48;
  const fontFamily = (properties.fontFamily as string) ?? "Inter";
  const fontWeight = (properties.fontWeight as string) ?? "400";
  const fontStyle = (properties.fontStyle as string) ?? "normal";
  const color = (properties.color as string) ?? "#ffffff";
  const align = (properties.align as string) ?? "left";
  const renderMode = (properties.renderMode as string) ?? "auto";
  const kerning = (properties.kerning as string) ?? "metrics";
  const opticalAlign = (properties.opticalAlign as boolean) ?? true;
  const letterSpacing = (properties.letterSpacing as number) ?? 0;
  const tracking = (properties.tracking as number) ?? 0;

  // Try path-based rendering when renderMode is "path" or "auto" (SVG default)
  if (renderMode === "path" || renderMode === "auto") {
    const loaded = getFont(fontFamily, parseInt(fontWeight, 10));
    if (loaded) {
      return renderAsPath(text, loaded.font, {
        fontSize,
        color,
        align,
        bounds,
        kerning: kerning as "metrics" | "optical" | "none",
        opticalAlign,
        letterSpacing,
        tracking,
      });
    }
  }

  // Fallback: standard <text> element
  return renderAsText(text, {
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    color,
    align,
    bounds,
  });
}

interface PathRenderOptions {
  fontSize: number;
  color: string;
  align: string;
  bounds: LayerBounds;
  kerning: "metrics" | "optical" | "none";
  opticalAlign: boolean;
  letterSpacing: number;
  tracking: number;
}

function renderAsPath(
  text: string,
  font: import("opentype.js").Font,
  options: PathRenderOptions,
): string {
  const result = textToPath(text, {
    font,
    fontSize: options.fontSize,
    kerning: options.kerning,
    opticalAlign: options.opticalAlign,
    letterSpacing: options.letterSpacing,
    tracking: options.tracking,
  });

  if (!result.svgPath) return "";

  // Calculate x offset based on alignment
  let xOffset = options.bounds.x;
  if (options.align === "center") {
    xOffset = options.bounds.x + (options.bounds.width - result.width) / 2;
  } else if (options.align === "right") {
    xOffset = options.bounds.x + options.bounds.width - result.width;
  }

  return `<g transform="translate(${xOffset},${options.bounds.y})"><path d="${result.svgPath}" fill="${options.color}"/></g>`;
}

interface TextRenderOptions {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  align: string;
  bounds: LayerBounds;
}

function renderAsText(text: string, options: TextRenderOptions): string {
  let textAnchor = "start";
  let x = options.bounds.x;
  if (options.align === "center") {
    textAnchor = "middle";
    x = options.bounds.x + options.bounds.width / 2;
  } else if (options.align === "right") {
    textAnchor = "end";
    x = options.bounds.x + options.bounds.width;
  }

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<text x="${x}" y="${options.bounds.y + options.fontSize}" font-family="${options.fontFamily}" font-size="${options.fontSize}" font-weight="${options.fontWeight}" font-style="${options.fontStyle}" fill="${options.color}" text-anchor="${textAnchor}">${escaped}</text>`;
}
