import type { LayerProperties, LayerBounds } from "@genart-dev/core";
import { resolveFontStack } from "./fonts.js";
import { getFont } from "./font-loader.js";
import { getMetricsKerning, getOpticalKerning } from "./kerning.js";

/**
 * Render text onto a 2D canvas context.
 * Handles multiline text, alignment, stroke, shadow, and per-character
 * kerning/spacing when advanced typography settings are active.
 */
export function renderText(
  properties: LayerProperties,
  ctx: CanvasRenderingContext2D,
  bounds: LayerBounds,
): void {
  const text = (properties.text as string) ?? "";
  if (!text) return;

  const fontSize = (properties.fontSize as number) ?? 48;
  const fontFamily = (properties.fontFamily as string) ?? "Inter";
  const fontWeight = (properties.fontWeight as string) ?? "400";
  const fontStyle = (properties.fontStyle as string) ?? "normal";
  const color = (properties.color as string) ?? "#ffffff";
  const align = (properties.align as string) ?? "left";
  const baseline = (properties.baseline as string) ?? "top";
  const lineHeight = (properties.lineHeight as number) ?? 1.2;
  const letterSpacing = (properties.letterSpacing as number) ?? 0;
  const tracking = (properties.tracking as number) ?? 0;
  const kerning = (properties.kerning as string) ?? "metrics";

  const strokeEnabled = (properties.strokeEnabled as boolean) ?? false;
  const strokeColor = (properties.strokeColor as string) ?? "#000000";
  const strokeWidth = (properties.strokeWidth as number) ?? 2;

  const shadowEnabled = (properties.shadowEnabled as boolean) ?? false;
  const shadowColor = (properties.shadowColor as string) ?? "rgba(0,0,0,0.5)";
  const shadowBlur = (properties.shadowBlur as number) ?? 4;
  const shadowOffsetX = (properties.shadowOffsetX as number) ?? 2;
  const shadowOffsetY = (properties.shadowOffsetY as number) ?? 2;

  ctx.save();

  // Build font string
  const fontStack = resolveFontStack(fontFamily);
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontStack}`;
  ctx.textAlign = align as CanvasTextAlign;
  ctx.textBaseline = baseline as CanvasTextBaseline;

  // Calculate x position based on alignment
  let x = bounds.x;
  if (align === "center") {
    x = bounds.x + bounds.width / 2;
  } else if (align === "right") {
    x = bounds.x + bounds.width;
  }

  // Set up shadow
  if (shadowEnabled) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
  }

  // Determine if we need per-character rendering
  const needsPerChar = letterSpacing !== 0 || tracking !== 0 || kerning !== "none";
  const loadedFont = needsPerChar ? getFont(fontFamily, parseInt(fontWeight, 10)) : null;
  const usePerChar = needsPerChar && loadedFont !== null && (letterSpacing !== 0 || tracking !== 0 || kerning !== "metrics");

  // Split by newlines and render each line
  const lines = text.split("\n");
  const lineSpacing = fontSize * lineHeight;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const y = bounds.y + i * lineSpacing;

    if (usePerChar && loadedFont) {
      renderLinePerChar(ctx, line, x, y, {
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        color,
        align,
        letterSpacing,
        tracking,
        kerning,
        strokeEnabled,
        strokeColor,
        strokeWidth,
        font: loadedFont.font,
      });
    } else {
      // Standard single-call rendering
      if (strokeEnabled && strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = "round";
        ctx.strokeText(line, x, y);
      }
      ctx.fillStyle = color;
      ctx.fillText(line, x, y);
    }
  }

  ctx.restore();
}

interface PerCharOptions {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  align: string;
  letterSpacing: number;
  tracking: number;
  kerning: string;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  font: import("opentype.js").Font;
}

/**
 * Render a single line of text character by character,
 * applying kerning and spacing adjustments.
 */
function renderLinePerChar(
  ctx: CanvasRenderingContext2D,
  line: string,
  baseX: number,
  y: number,
  options: PerCharOptions,
): void {
  const { font, fontSize, kerning, letterSpacing, tracking } = options;
  const scale = fontSize / font.unitsPerEm;

  // Get kerning adjustments
  let kernValues: number[] = [];
  if (kerning === "optical") {
    kernValues = getOpticalKerning(font, line, fontSize);
  } else if (kerning === "metrics") {
    kernValues = getMetricsKerning(font, line);
  }

  // Compute per-character positions
  const chars = Array.from(line);
  const positions: number[] = [0];

  for (let i = 1; i < chars.length; i++) {
    const prevGlyph = font.charToGlyph(chars[i - 1]!);
    const prevAdvance = (prevGlyph.advanceWidth ?? 0) * scale;
    const kern = (kernValues[i - 1] ?? 0) * scale;
    const spacing = letterSpacing + tracking * scale;
    positions.push(positions[i - 1]! + prevAdvance + kern + spacing);
  }

  // Calculate total width for alignment
  const lastChar = chars[chars.length - 1]!;
  const lastGlyph = font.charToGlyph(lastChar);
  const lastAdvance = (lastGlyph.advanceWidth ?? 0) * scale;
  const totalWidth = (positions[positions.length - 1] ?? 0) + lastAdvance;

  // Adjust baseX for alignment
  let offsetX = baseX;
  if (options.align === "center") {
    offsetX = baseX - totalWidth / 2;
  } else if (options.align === "right") {
    offsetX = baseX - totalWidth;
  }

  // Render each character
  // Override alignment for per-char rendering — we position manually
  const savedAlign = ctx.textAlign;
  ctx.textAlign = "left";

  for (let i = 0; i < chars.length; i++) {
    const charX = offsetX + positions[i]!;

    if (options.strokeEnabled && options.strokeWidth > 0) {
      ctx.strokeStyle = options.strokeColor;
      ctx.lineWidth = options.strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(chars[i]!, charX, y);
    }

    ctx.fillStyle = options.color;
    ctx.fillText(chars[i]!, charX, y);
  }

  ctx.textAlign = savedAlign;
}
