import { describe, it, expect, vi } from "vitest";
import { textLayerType } from "../src/text-layer.js";
import type { LayerBounds, RenderResources } from "@genart-dev/core";

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

describe("textLayerType", () => {
  it("has correct metadata", () => {
    expect(textLayerType.typeId).toBe("typography:text");
    expect(textLayerType.displayName).toBe("Text");
    expect(textLayerType.icon).toBe("type");
    expect(textLayerType.category).toBe("text");
  });

  it("creates default properties with all keys", () => {
    const defaults = textLayerType.createDefault();
    expect(defaults.text).toBe("Hello World");
    expect(defaults.fontFamily).toBe("Inter");
    expect(defaults.fontSize).toBe(48);
    expect(defaults.fontWeight).toBe("400");
    expect(defaults.color).toBe("#ffffff");
    expect(defaults.align).toBe("left");
    expect(defaults.strokeEnabled).toBe(false);
    expect(defaults.shadowEnabled).toBe(false);
  });

  describe("render", () => {
    it("calls fillText with correct text", () => {
      const ctx = createMockCtx();
      const props = { ...textLayerType.createDefault(), text: "Test" };
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalledWith("Test", BOUNDS.x, BOUNDS.y);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it("does not render empty text", () => {
      const ctx = createMockCtx();
      const props = { ...textLayerType.createDefault(), text: "" };
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it("renders centered text at midpoint", () => {
      const ctx = createMockCtx();
      const props = { ...textLayerType.createDefault(), align: "center" };
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.textAlign).toBe("center");
      expect(ctx.fillText).toHaveBeenCalledWith(
        "Hello World",
        BOUNDS.x + BOUNDS.width / 2,
        BOUNDS.y,
      );
    });

    it("renders right-aligned text at right edge", () => {
      const ctx = createMockCtx();
      const props = { ...textLayerType.createDefault(), align: "right" };
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.textAlign).toBe("right");
      expect(ctx.fillText).toHaveBeenCalledWith(
        "Hello World",
        BOUNDS.x + BOUNDS.width,
        BOUNDS.y,
      );
    });

    it("renders stroke when enabled", () => {
      const ctx = createMockCtx();
      const props = {
        ...textLayerType.createDefault(),
        text: "Outlined",
        strokeEnabled: true,
        strokeColor: "#ff0000",
        strokeWidth: 3,
      };
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.strokeText).toHaveBeenCalledWith("Outlined", BOUNDS.x, BOUNDS.y);
      expect(ctx.strokeStyle).toBe("#ff0000");
      expect(ctx.lineWidth).toBe(3);
    });

    it("skips stroke when disabled", () => {
      const ctx = createMockCtx();
      const props = textLayerType.createDefault();
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.strokeText).not.toHaveBeenCalled();
    });

    it("sets shadow properties when enabled", () => {
      const ctx = createMockCtx();
      const props = {
        ...textLayerType.createDefault(),
        shadowEnabled: true,
        shadowColor: "rgba(0,0,0,0.8)",
        shadowBlur: 10,
        shadowOffsetX: 5,
        shadowOffsetY: 5,
      };
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.shadowColor).toBe("rgba(0,0,0,0.8)");
      expect(ctx.shadowBlur).toBe(10);
      expect(ctx.shadowOffsetX).toBe(5);
      expect(ctx.shadowOffsetY).toBe(5);
    });

    it("renders multiline text", () => {
      const ctx = createMockCtx();
      const props = {
        ...textLayerType.createDefault(),
        text: "Line 1\nLine 2\nLine 3",
        fontSize: 24,
        lineHeight: 1.5,
      };
      textLayerType.render(props, ctx, BOUNDS, RESOURCES);

      expect(ctx.fillText).toHaveBeenCalledTimes(3);
      expect(ctx.fillText).toHaveBeenCalledWith("Line 1", BOUNDS.x, BOUNDS.y);
      expect(ctx.fillText).toHaveBeenCalledWith("Line 2", BOUNDS.x, BOUNDS.y + 36);
      expect(ctx.fillText).toHaveBeenCalledWith("Line 3", BOUNDS.x, BOUNDS.y + 72);
    });
  });

  describe("renderSVG", () => {
    it("returns valid SVG text element", () => {
      const props = textLayerType.createDefault();
      const svg = textLayerType.renderSVG!(props, BOUNDS, RESOURCES);

      expect(svg).toContain("<text");
      expect(svg).toContain("Hello World");
      expect(svg).toContain('font-family="Inter"');
      expect(svg).toContain('font-size="48"');
    });

    it("escapes HTML entities", () => {
      const props = { ...textLayerType.createDefault(), text: "<script>&test" };
      const svg = textLayerType.renderSVG!(props, BOUNDS, RESOURCES);

      expect(svg).toContain("&lt;script&gt;");
      expect(svg).toContain("&amp;test");
    });

    it("centers text with text-anchor", () => {
      const props = { ...textLayerType.createDefault(), align: "center" };
      const svg = textLayerType.renderSVG!(props, BOUNDS, RESOURCES);

      expect(svg).toContain('text-anchor="middle"');
    });
  });

  describe("validate", () => {
    it("returns null for valid properties", () => {
      const props = textLayerType.createDefault();
      expect(textLayerType.validate(props)).toBeNull();
    });

    it("catches non-string text", () => {
      const props = { ...textLayerType.createDefault(), text: 42 };
      const errors = textLayerType.validate(props);
      expect(errors).toHaveLength(1);
      expect(errors![0]!.property).toBe("text");
    });

    it("catches invalid font size", () => {
      const props = { ...textLayerType.createDefault(), fontSize: -5 };
      const errors = textLayerType.validate(props);
      expect(errors).not.toBeNull();
      expect(errors!.some((e) => e.property === "fontSize")).toBe(true);
    });

    it("catches invalid font weight", () => {
      const props = { ...textLayerType.createDefault(), fontWeight: "999" };
      const errors = textLayerType.validate(props);
      expect(errors).not.toBeNull();
      expect(errors!.some((e) => e.property === "fontWeight")).toBe(true);
    });
  });
});
