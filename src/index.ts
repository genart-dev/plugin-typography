import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { textLayerType } from "./text-layer.js";
import { typographyMcpTools } from "./text-tools.js";
import { registerFont, getRegistrySize } from "./font-loader.js";

/** Bundled font files relative to the fonts/ directory. */
const BUNDLED_FONTS = [
  { file: "Inter-Variable.ttf", family: "Inter", weight: 400 },
  { file: "SourceSerif4-Variable.ttf", family: "Source Serif 4", weight: 400 },
  { file: "JetBrainsMono-Variable.ttf", family: "JetBrains Mono", weight: 400 },
] as const;

/**
 * Resolve the fonts/ directory path, handling both CJS and ESM contexts.
 */
function getFontsDir(): string | null {
  try {
    // Node.js fs/path — only available in Node contexts
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");

    // Try __dirname (CJS) first, then import.meta.url-derived path
    let dir: string;
    if (typeof __dirname !== "undefined") {
      // CJS: __dirname is dist/, fonts/ is at ../fonts/
      dir = path.resolve(__dirname, "..", "fonts");
    } else {
      // ESM: resolve from this file's URL
      dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "fonts");
    }

    if (fs.existsSync(dir)) return dir;
    return null;
  } catch {
    // Browser context — no fs available
    return null;
  }
}

const typographyPlugin: DesignPlugin = {
  id: "typography",
  name: "Typography",
  version: "0.2.0",
  tier: "free",
  description:
    "Professional text layers with opentype.js kerning, optical alignment, " +
    "text-to-path rendering, modular type scales, and custom font loading.",

  layerTypes: [textLayerType],
  tools: [],
  exportHandlers: [],
  mcpTools: typographyMcpTools,

  async initialize(_context: PluginContext): Promise<void> {
    // Skip if fonts already registered (e.g., re-init)
    if (getRegistrySize() >= BUNDLED_FONTS.length) return;

    const fontsDir = getFontsDir();
    if (!fontsDir) return; // Browser context — no bundled font loading

    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");

    for (const { file, family, weight } of BUNDLED_FONTS) {
      const filePath = path.join(fontsDir, file);
      try {
        const buffer = fs.readFileSync(filePath);
        registerFont(
          buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
          { family, weight },
          "built-in",
        );
      } catch {
        // Font file missing or corrupt — skip silently
      }
    }
  },

  dispose(): void {
    // Font registry persists across plugin lifecycle for reuse
  },
};

export default typographyPlugin;
export { textLayerType } from "./text-layer.js";
export { typographyMcpTools } from "./text-tools.js";
export { BUILT_IN_FONTS, resolveFontStack } from "./fonts.js";

// New exports for 0.2.0
export { generateScale, suggestScale, SCALE_RATIOS } from "./type-scale.js";
export type { TypeScale, ScaleRatio } from "./type-scale.js";
export { getMetrics, getGlyphMetrics } from "./font-metrics.js";
export type { FontMetrics, GlyphMetrics } from "./font-metrics.js";
export { registerFont, loadFont, getFont, listRegisteredFonts, clearRegistry } from "./font-loader.js";
export type { LoadedFont } from "./font-loader.js";
export { getMetricsKerning, getOpticalKerning, extractKernPairs, applyKerning } from "./kerning.js";
export type { KernPair } from "./kerning.js";
export { classifyGlyph, classifyText, applyOvershoot, DEFAULT_OPTICAL_RULES } from "./optical.js";
export type { GlyphShape, OpticalRules, PositionedGlyph } from "./optical.js";
export { textToPath, textToSVG } from "./text-path.js";
export type { TextPathOptions, TextPathResult, GlyphPathResult } from "./text-path.js";
