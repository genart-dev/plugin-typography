import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderTextSVG } from "../src/text-render-svg.js";
import { registerFont, clearRegistry } from "../src/font-loader.js";
import type { LayerBounds, LayerProperties } from "@genart-dev/core";

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

function defaultProps(overrides: Partial<LayerProperties> = {}): LayerProperties {
  return {
    text: "Hello World",
    fontFamily: "Inter",
    fontSize: 48,
    fontWeight: "400",
    fontStyle: "normal",
    color: "#ffffff",
    align: "left",
    letterSpacing: 0,
    tracking: 0,
    kerning: "metrics",
    opticalAlign: true,
    renderMode: "auto",
    customFont: "",
    ...overrides,
  };
}

describe("text-render-svg", () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe("fallback to <text> element", () => {
    it("renders <text> when no font registered", () => {
      const svg = renderTextSVG(defaultProps(), BOUNDS);
      expect(svg).toContain("<text");
      expect(svg).toContain("Hello World");
      expect(svg).toContain('font-family="Inter"');
    });

    it("renders <text> when renderMode is 'text'", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      const svg = renderTextSVG(defaultProps({ renderMode: "text" }), BOUNDS);
      expect(svg).toContain("<text");
      expect(svg).not.toContain("<path");
    });

    it("escapes HTML entities in fallback", () => {
      const svg = renderTextSVG(defaultProps({ text: "<b>&test</b>" }), BOUNDS);
      expect(svg).toContain("&lt;b&gt;");
      expect(svg).toContain("&amp;test");
    });
  });

  describe("path-based rendering", () => {
    it("renders <path> when font registered and renderMode is auto", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      const svg = renderTextSVG(defaultProps(), BOUNDS);
      expect(svg).toContain("<path");
      expect(svg).toContain('fill="#ffffff"');
    });

    it("renders <path> when renderMode is path", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      const svg = renderTextSVG(defaultProps({ renderMode: "path" }), BOUNDS);
      expect(svg).toContain("<path");
    });

    it("wraps path in <g> with transform", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      const svg = renderTextSVG(defaultProps(), BOUNDS);
      expect(svg).toContain("<g transform=");
    });

    it("centers path when align is center", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      const left = renderTextSVG(defaultProps({ align: "left" }), BOUNDS);
      const center = renderTextSVG(defaultProps({ align: "center" }), BOUNDS);
      // Both should have paths but different translate offsets
      expect(left).toContain("<path");
      expect(center).toContain("<path");
      expect(left).not.toBe(center);
    });
  });

  describe("empty text", () => {
    it("returns empty string for empty text", () => {
      expect(renderTextSVG(defaultProps({ text: "" }), BOUNDS)).toBe("");
    });
  });
});
