import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import typographyPlugin from "../src/index.js";
import { textLayerType } from "../src/text-layer.js";
import { registerFont, clearRegistry } from "../src/font-loader.js";
import type { LayerBounds, RenderResources } from "@genart-dev/core";

const FONT_PATH = resolve(__dirname, "../fonts/Inter-Variable.ttf");
const fontBuffer = readFileSync(FONT_PATH);

const BOUNDS: LayerBounds = {
  x: 10,
  y: 20,
  width: 400,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

const RESOURCES: RenderResources = {
  getFont: () => null,
  getImage: () => null,
  theme: "dark",
  pixelRatio: 1,
};

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    font: "",
    fillStyle: "",
    strokeStyle: "",
    textAlign: "" as CanvasTextAlign,
    textBaseline: "" as CanvasTextBaseline,
    lineWidth: 0,
    lineJoin: "" as CanvasLineJoin,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
}

describe("backward compatibility", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("default properties include all original 0.1.x properties", () => {
    const defaults = textLayerType.createDefault();

    // All original properties must be present
    const originalKeys = [
      "text", "fontFamily", "fontSize", "fontWeight", "fontStyle",
      "color", "align", "baseline", "lineHeight",
      "strokeEnabled", "strokeColor", "strokeWidth",
      "shadowEnabled", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY",
    ];

    for (const key of originalKeys) {
      expect(defaults).toHaveProperty(key);
    }
  });

  it("new properties have backward-compatible defaults", () => {
    const defaults = textLayerType.createDefault();

    // New properties should not change existing rendering behavior when at defaults
    expect(defaults.letterSpacing).toBe(0);     // no extra spacing
    expect(defaults.tracking).toBe(0);           // no extra tracking
    expect(defaults.kerning).toBe("metrics");    // standard font kerning
    expect(defaults.opticalAlign).toBe(true);    // on by default (enhances quality)
    expect(defaults.renderMode).toBe("auto");    // auto = text for canvas2d
    expect(defaults.customFont).toBe("");        // no custom font
  });

  it("canvas2d render with defaults produces identical output to 0.1.x", () => {
    // With default properties and no registered font, rendering should
    // use the same single fillText path as before
    const ctx = createMockCtx();
    const defaults = textLayerType.createDefault();

    textLayerType.render(defaults, ctx, BOUNDS, RESOURCES);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith("Hello World", BOUNDS.x, BOUNDS.y);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("SVG render with defaults falls back to <text> element", () => {
    // No font registered → falls back to standard <text> element
    const defaults = textLayerType.createDefault();
    const svg = textLayerType.renderSVG!(defaults, BOUNDS, RESOURCES);

    expect(svg).toContain("<text");
    expect(svg).toContain("Hello World");
    expect(svg).toContain('font-family="Inter"');
  });

  it("SVG render uses path when font is registered", () => {
    registerFont(fontBuffer, { family: "Inter", weight: 400 });
    const defaults = textLayerType.createDefault();
    const svg = textLayerType.renderSVG!(defaults, BOUNDS, RESOURCES);

    expect(svg).toContain("<path");
    expect(svg).toContain('fill="#ffffff"');
  });

  it("validation accepts all 0.1.x valid properties", () => {
    const props = {
      text: "Hello",
      fontFamily: "Inter",
      fontSize: 48,
      fontWeight: "400",
      fontStyle: "normal",
      color: "#ffffff",
      align: "left",
      baseline: "top",
      lineHeight: 1.2,
      strokeEnabled: false,
      strokeColor: "#000000",
      strokeWidth: 2,
      shadowEnabled: false,
      shadowColor: "rgba(0,0,0,0.5)",
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
    };

    expect(textLayerType.validate(props)).toBeNull();
  });

  it("validation accepts new weight values", () => {
    const weights = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
    for (const weight of weights) {
      const props = { ...textLayerType.createDefault(), fontWeight: weight };
      expect(textLayerType.validate(props)).toBeNull();
    }
  });

  it("plugin exports all expected modules", () => {
    // Verify public API surface
    expect(typographyPlugin.id).toBe("typography");
    expect(typographyPlugin.version).toBe("0.2.0");
    expect(typographyPlugin.layerTypes).toHaveLength(1);
    expect(typographyPlugin.mcpTools).toHaveLength(9);
  });
});
