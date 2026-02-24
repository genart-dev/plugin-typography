import type { LayerProperties, LayerBounds } from "@genart-dev/core";
import { resolveFontStack } from "./fonts.js";

/**
 * Render text onto a 2D canvas context.
 * Handles multiline text, alignment, stroke, and shadow.
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

  // Split by newlines and render each line
  const lines = text.split("\n");
  const lineSpacing = fontSize * lineHeight;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const y = bounds.y + i * lineSpacing;

    // Stroke first (underneath fill)
    if (strokeEnabled && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(line, x, y);
    }

    // Fill
    ctx.fillStyle = color;
    ctx.fillText(line, x, y);
  }

  ctx.restore();
}
