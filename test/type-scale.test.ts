import { describe, it, expect } from "vitest";
import { generateScale, suggestScale, SCALE_RATIOS, type ScaleRatio } from "../src/type-scale.js";

describe("type-scale", () => {
  describe("generateScale", () => {
    it("generates scale with named ratio", () => {
      const scale = generateScale(16, "golden", 4, 2);
      expect(scale.base).toBe(16);
      expect(scale.ratio).toBe(1.618);
      expect(scale.steps).toHaveLength(7); // 2 down + base + 4 up
      // Base should be in the middle
      expect(scale.steps[2]).toBe(16);
    });

    it("generates scale with numeric ratio", () => {
      const scale = generateScale(16, 2, 3, 0);
      expect(scale.ratio).toBe(2);
      expect(scale.steps).toHaveLength(4); // base + 3 up
      expect(scale.steps[0]).toBe(16);
      expect(scale.steps[1]).toBe(32);
      expect(scale.steps[2]).toBe(64);
      expect(scale.steps[3]).toBe(128);
    });

    it("generates correct golden ratio scale from base 16", () => {
      const scale = generateScale(16, "golden", 4, 2);
      // Golden ratio: each step is ~1.618x the previous
      // Down: 16/1.618^2 ≈ 6, 16/1.618 ≈ 10
      // Up: 16*1.618 ≈ 26, 16*1.618^2 ≈ 42, 16*1.618^3 ≈ 68, 16*1.618^4 ≈ 109
      expect(scale.steps[0]).toBe(6);   // caption
      expect(scale.steps[1]).toBe(10);  // small
      expect(scale.steps[2]).toBe(16);  // body
      expect(scale.steps[3]).toBe(26);  // h4
      expect(scale.steps[4]).toBe(42);  // h3
      expect(scale.steps[5]).toBe(68);  // h2
      expect(scale.steps[6]).toBe(110); // h1 (16 * 1.618^4 ≈ 109.6 → 110)
    });

    it("assigns labels to steps", () => {
      const scale = generateScale(16, "major-third", 3, 1);
      expect(scale.labels).toHaveLength(5);
      expect(scale.labels[0]).toBe("caption");
      expect(scale.labels[1]).toBe("small");
      expect(scale.labels[2]).toBe("body");
    });

    it("generates extra labels for many steps", () => {
      const scale = generateScale(16, "minor-second", 8, 2);
      // 11 total steps — last one should be step-10
      expect(scale.labels[10]).toBe("step-10");
    });

    it("handles zero stepsDown", () => {
      const scale = generateScale(16, "major-second", 3, 0);
      expect(scale.steps[0]).toBe(16);
      expect(scale.steps).toHaveLength(4);
    });

    it("throws for non-positive ratio", () => {
      expect(() => generateScale(16, 0, 4)).toThrow("Ratio must be positive");
      expect(() => generateScale(16, -1, 4)).toThrow("Ratio must be positive");
    });

    it("throws for non-positive base", () => {
      expect(() => generateScale(0, "golden", 4)).toThrow("Base size must be positive");
      expect(() => generateScale(-10, "golden", 4)).toThrow("Base size must be positive");
    });

    it("produces monotonically increasing steps", () => {
      for (const ratio of Object.keys(SCALE_RATIOS) as ScaleRatio[]) {
        const scale = generateScale(16, ratio, 5, 2);
        for (let i = 1; i < scale.steps.length; i++) {
          expect(scale.steps[i]!).toBeGreaterThanOrEqual(scale.steps[i - 1]!);
        }
      }
    });
  });

  describe("suggestScale", () => {
    it("suggests golden ratio for 16→68", () => {
      const result = suggestScale(16, 68);
      // 16 * 1.618^3 ≈ 67.8
      expect(result.ratio).toBe("golden");
      expect(result.steps).toBe(3);
    });

    it("suggests minor-second for small range", () => {
      const result = suggestScale(16, 18);
      expect(SCALE_RATIOS[result.ratio]).toBeLessThanOrEqual(1.2);
    });

    it("returns minor-second with 1 step when display <= body", () => {
      const result = suggestScale(16, 16);
      expect(result.ratio).toBe("minor-second");
      expect(result.steps).toBe(1);
    });

    it("suggests perfect-fifth for large range", () => {
      const result = suggestScale(16, 54);
      // 16 * 1.5^3 = 54
      expect(result.ratio).toBe("perfect-fifth");
      expect(result.steps).toBe(3);
    });
  });
});
