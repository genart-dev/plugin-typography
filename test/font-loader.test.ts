import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  registerFont,
  loadFont,
  getFont,
  listRegisteredFonts,
  clearRegistry,
  getRegistrySize,
} from "../src/font-loader.js";

const FONT_PATH = resolve(__dirname, "../fonts/Inter-Variable.ttf");
const fontBuffer = readFileSync(FONT_PATH);

describe("font-loader", () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe("loadFont", () => {
    it("parses a font buffer and returns metadata", () => {
      const loaded = loadFont(fontBuffer);
      expect(loaded.family).toBeTruthy();
      expect(loaded.weight).toBeGreaterThanOrEqual(100);
      expect(loaded.style).toBe("normal");
      expect(loaded.font).toBeDefined();
      expect(loaded.source).toBe("custom");
    });

    it("uses provided metadata overrides", () => {
      const loaded = loadFont(fontBuffer, { family: "MyFont", weight: 500 });
      expect(loaded.family).toBe("MyFont");
      expect(loaded.weight).toBe(500);
    });

    it("does not register the font", () => {
      loadFont(fontBuffer);
      expect(getRegistrySize()).toBe(0);
    });
  });

  describe("registerFont", () => {
    it("registers and retrieves a font", () => {
      const loaded = registerFont(fontBuffer, { family: "Inter", weight: 400 });
      expect(loaded.source).toBe("custom");

      const retrieved = getFont("Inter", 400);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.family).toBe("Inter");
    });

    it("registers as built-in when specified", () => {
      const loaded = registerFont(fontBuffer, { family: "Inter", weight: 400 }, "built-in");
      expect(loaded.source).toBe("built-in");
    });

    it("accepts Uint8Array input", () => {
      const uint8 = new Uint8Array(fontBuffer);
      const loaded = registerFont(uint8, { family: "Inter", weight: 400 });
      expect(loaded.font).toBeDefined();
    });
  });

  describe("getFont", () => {
    it("returns null for unregistered font", () => {
      expect(getFont("NonExistent")).toBeNull();
    });

    it("falls back to closest weight", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      const result = getFont("Inter", 500);
      expect(result).not.toBeNull();
      expect(result!.weight).toBe(400);
    });

    it("is case-insensitive for family name", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      expect(getFont("inter", 400)).not.toBeNull();
      expect(getFont("INTER", 400)).not.toBeNull();
    });
  });

  describe("listRegisteredFonts", () => {
    it("returns empty array when no fonts registered", () => {
      expect(listRegisteredFonts()).toHaveLength(0);
    });

    it("returns all registered fonts", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      registerFont(fontBuffer, { family: "Inter", weight: 700 });
      expect(listRegisteredFonts()).toHaveLength(2);
    });
  });

  describe("clearRegistry", () => {
    it("removes all registered fonts", () => {
      registerFont(fontBuffer, { family: "Inter", weight: 400 });
      expect(getRegistrySize()).toBe(1);
      clearRegistry();
      expect(getRegistrySize()).toBe(0);
    });
  });
});
