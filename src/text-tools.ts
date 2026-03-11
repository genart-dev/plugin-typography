import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  JsonSchema,
  DesignLayer,
  LayerTransform,
  LayerProperties,
} from "@genart-dev/core";
import { textLayerType } from "./text-layer.js";
import { BUILT_IN_FONTS } from "./fonts.js";
import { generateScale, SCALE_RATIOS, type ScaleRatio } from "./type-scale.js";
import { getFont, registerFont, listRegisteredFonts } from "./font-loader.js";
import { getMetrics } from "./font-metrics.js";
import { getMetricsKerning, getOpticalKerning, extractKernPairs } from "./kerning.js";
import { textToPath } from "./text-path.js";

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Existing tools (expanded)
// ---------------------------------------------------------------------------

export const setTextTool: McpToolDefinition = {
  name: "set_text",
  description:
    "Add a text layer or update the text content of an existing text layer. " +
    "If layerId is provided, updates that layer; otherwise creates a new text layer.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: {
        type: "string",
        description: "ID of existing text layer to update. Omit to create a new layer.",
      },
      text: {
        type: "string",
        description: "The text content to display.",
      },
      x: {
        type: "number",
        description: "X position on canvas (default: 50).",
      },
      y: {
        type: "number",
        description: "Y position on canvas (default: 50).",
      },
      fontSize: {
        type: "number",
        description: "Font size in pixels (default: 48).",
      },
      fontFamily: {
        type: "string",
        description: "Font family name (default: 'Inter').",
      },
      color: {
        type: "string",
        description: "Text color as hex string (default: '#ffffff').",
      },
      align: {
        type: "string",
        enum: ["left", "center", "right"],
        description: "Text alignment (default: 'left').",
      },
      letterSpacing: {
        type: "number",
        description: "Letter spacing in pixels (default: 0).",
      },
      tracking: {
        type: "number",
        description: "Tracking in em units (default: 0).",
      },
      kerning: {
        type: "string",
        enum: ["metrics", "optical", "none"],
        description: "Kerning mode (default: 'metrics').",
      },
      renderMode: {
        type: "string",
        enum: ["auto", "text", "path"],
        description: "Render mode (default: 'auto').",
      },
    },
    required: ["text"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const text = input.text as string;
    const layerId = input.layerId as string | undefined;

    if (layerId) {
      const layer = context.layers.get(layerId);
      if (!layer) return errorResult(`Layer '${layerId}' not found.`);
      if (layer.type !== "typography:text")
        return errorResult(`Layer '${layerId}' is not a text layer.`);

      const updates: Record<string, unknown> = { text };
      for (const key of ["fontSize", "fontFamily", "color", "align", "letterSpacing", "tracking", "kerning", "renderMode"]) {
        if (input[key] !== undefined) updates[key] = input[key];
      }

      context.layers.updateProperties(layerId, updates as Partial<LayerProperties>);

      if (input.x !== undefined || input.y !== undefined) {
        context.layers.updateTransform(layerId, {
          ...(input.x !== undefined ? { x: input.x as number } : {}),
          ...(input.y !== undefined ? { y: input.y as number } : {}),
        } as Partial<LayerTransform>);
      }

      context.emitChange("layer-updated");
      return textResult(`Updated text layer '${layerId}'.`);
    }

    // Create new layer
    const id = generateLayerId();
    const defaults = textLayerType.createDefault();
    const properties: Record<string, unknown> = { ...defaults, text };
    for (const key of ["fontSize", "fontFamily", "color", "align", "letterSpacing", "tracking", "kerning", "renderMode"]) {
      if (input[key] !== undefined) properties[key] = input[key];
    }

    const layer: DesignLayer = {
      id,
      type: "typography:text",
      name: text.length > 20 ? text.slice(0, 20) + "…" : text,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      transform: {
        x: (input.x as number) ?? 50,
        y: (input.y as number) ?? 50,
        width: context.canvasWidth - 100,
        height: (properties.fontSize as number) * 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0,
        anchorY: 0,
      },
      properties: properties as LayerProperties,
    };

    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(`Created text layer '${id}' with text "${text}".`);
  },
};

export const applyTextStyleTool: McpToolDefinition = {
  name: "apply_text_style",
  description:
    "Apply styling to an existing text layer: font, size, weight (100–900), color, stroke, shadow, " +
    "letter-spacing, tracking, kerning mode, optical alignment, and render mode.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: {
        type: "string",
        description: "ID of the text layer to style.",
      },
      fontFamily: { type: "string", description: "Font family name." },
      fontSize: { type: "number", description: "Font size in pixels." },
      fontWeight: {
        type: "string",
        enum: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
        description: "Font weight (100–900).",
      },
      fontStyle: {
        type: "string",
        enum: ["normal", "italic"],
        description: "Font style.",
      },
      color: { type: "string", description: "Fill color (hex)." },
      lineHeight: { type: "number", description: "Line height multiplier." },
      letterSpacing: { type: "number", description: "Letter spacing in pixels." },
      tracking: { type: "number", description: "Tracking in em units." },
      kerning: {
        type: "string",
        enum: ["metrics", "optical", "none"],
        description: "Kerning mode.",
      },
      opticalAlign: { type: "boolean", description: "Enable optical alignment." },
      renderMode: {
        type: "string",
        enum: ["auto", "text", "path"],
        description: "Render mode.",
      },
      strokeEnabled: { type: "boolean", description: "Enable text stroke." },
      strokeColor: { type: "string", description: "Stroke color (hex)." },
      strokeWidth: { type: "number", description: "Stroke width in pixels." },
    },
    required: ["layerId"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);
    if (layer.type !== "typography:text")
      return errorResult(`Layer '${layerId}' is not a text layer.`);

    const updates: Record<string, unknown> = {};
    const styleKeys = [
      "fontFamily", "fontSize", "fontWeight", "fontStyle",
      "color", "lineHeight",
      "letterSpacing", "tracking", "kerning", "opticalAlign", "renderMode",
      "strokeEnabled", "strokeColor", "strokeWidth",
    ];
    for (const key of styleKeys) {
      if (input[key] !== undefined) updates[key] = input[key];
    }

    if (Object.keys(updates).length === 0)
      return errorResult("No style properties provided.");

    context.layers.updateProperties(layerId, updates as Partial<LayerProperties>);
    context.emitChange("layer-updated");
    return textResult(`Applied style to text layer '${layerId}'.`);
  },
};

export const listFontsTool: McpToolDefinition = {
  name: "list_fonts",
  description:
    "List all available fonts (built-in system fonts and registered custom fonts) " +
    "with their weights, categories, and metrics when available.",
  inputSchema: {
    type: "object",
    properties: {},
  } satisfies JsonSchema,

  async handler(
    _input: Record<string, unknown>,
    _context: McpToolContext,
  ): Promise<McpToolResult> {
    const lines: string[] = [];

    // Built-in system fonts
    lines.push("Built-in fonts:");
    for (const f of BUILT_IN_FONTS) {
      lines.push(`  • ${f.family} — weights: ${f.weights.join(", ")} (${f.category})`);
    }

    // Registered fonts (from opentype.js)
    const registered = listRegisteredFonts();
    if (registered.length > 0) {
      lines.push("");
      lines.push("Registered fonts:");
      const families = new Map<string, number[]>();
      for (const f of registered) {
        const weights = families.get(f.family) ?? [];
        weights.push(f.weight);
        families.set(f.family, weights);
      }
      for (const [family, weights] of families) {
        const sorted = [...new Set(weights)].sort((a, b) => a - b);
        const loaded = getFont(family, sorted[0]!);
        if (loaded) {
          const metrics = getMetrics(loaded.font);
          lines.push(
            `  • ${family} — weights: ${sorted.join(", ")} (${loaded.source}) ` +
            `[xHeight: ${metrics.xHeight}, capHeight: ${metrics.capHeight}]`
          );
        } else {
          lines.push(`  • ${family} — weights: ${sorted.join(", ")}`);
        }
      }
    }

    return textResult(lines.join("\n"));
  },
};

export const setTextShadowTool: McpToolDefinition = {
  name: "set_text_shadow",
  description: "Enable or configure a drop shadow on a text layer.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: {
        type: "string",
        description: "ID of the text layer.",
      },
      enabled: {
        type: "boolean",
        description: "Enable or disable shadow.",
      },
      color: {
        type: "string",
        description: "Shadow color (CSS color string).",
      },
      blur: {
        type: "number",
        description: "Shadow blur radius.",
      },
      offsetX: {
        type: "number",
        description: "Horizontal shadow offset.",
      },
      offsetY: {
        type: "number",
        description: "Vertical shadow offset.",
      },
    },
    required: ["layerId"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);
    if (layer.type !== "typography:text")
      return errorResult(`Layer '${layerId}' is not a text layer.`);

    const updates: Record<string, unknown> = {};
    if (input.enabled !== undefined) updates.shadowEnabled = input.enabled;
    if (input.color !== undefined) updates.shadowColor = input.color;
    if (input.blur !== undefined) updates.shadowBlur = input.blur;
    if (input.offsetX !== undefined) updates.shadowOffsetX = input.offsetX;
    if (input.offsetY !== undefined) updates.shadowOffsetY = input.offsetY;

    context.layers.updateProperties(layerId, updates as Partial<LayerProperties>);
    context.emitChange("layer-updated");

    const enabled = (input.enabled as boolean) ?? layer.properties.shadowEnabled;
    return textResult(
      enabled
        ? `Shadow configured on text layer '${layerId}'.`
        : `Shadow disabled on text layer '${layerId}'.`,
    );
  },
};

// ---------------------------------------------------------------------------
// New tools
// ---------------------------------------------------------------------------

export const setTypeScaleTool: McpToolDefinition = {
  name: "set_type_scale",
  description:
    "Generate a modular type scale and optionally apply sizes to text layers. " +
    "Given a base size and ratio, computes a harmonious progression of font sizes.",
  inputSchema: {
    type: "object",
    properties: {
      base: {
        type: "number",
        description: "Base font size in pixels (e.g., 16).",
      },
      ratio: {
        type: "string",
        description: "Named ratio (minor-second, major-second, minor-third, major-third, perfect-fourth, augmented-fourth, perfect-fifth, golden) or numeric value.",
      },
      stepsUp: {
        type: "number",
        description: "Steps above base (default: 4).",
      },
      stepsDown: {
        type: "number",
        description: "Steps below base (default: 2).",
      },
      layerMappings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            layerId: { type: "string" },
            step: { type: "number", description: "Index into the generated scale array." },
          },
          required: ["layerId", "step"],
        },
        description: "Optional: assign scale sizes to specific text layers.",
      },
    },
    required: ["base", "ratio"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const base = input.base as number;
    const ratioInput = input.ratio as string;
    const stepsUp = (input.stepsUp as number) ?? 4;
    const stepsDown = (input.stepsDown as number) ?? 2;

    // Parse ratio — try named first, then numeric
    const ratio: ScaleRatio | number =
      ratioInput in SCALE_RATIOS
        ? (ratioInput as ScaleRatio)
        : parseFloat(ratioInput);

    if (typeof ratio === "number" && (isNaN(ratio) || ratio <= 0)) {
      return errorResult(`Invalid ratio: '${ratioInput}'. Use a named ratio or positive number.`);
    }

    const scale = generateScale(base, ratio, stepsUp, stepsDown);

    // Apply to layers if mappings provided
    const mappings = input.layerMappings as Array<{ layerId: string; step: number }> | undefined;
    const applied: string[] = [];
    if (mappings) {
      for (const { layerId, step } of mappings) {
        if (step < 0 || step >= scale.steps.length) {
          return errorResult(`Step ${step} out of range (0–${scale.steps.length - 1}).`);
        }
        const layer = context.layers.get(layerId);
        if (!layer) return errorResult(`Layer '${layerId}' not found.`);
        context.layers.updateProperties(layerId, { fontSize: scale.steps[step] } as Partial<LayerProperties>);
        applied.push(`${layerId} → ${scale.steps[step]}px (${scale.labels[step]})`);
      }
      context.emitChange("layer-updated");
    }

    const scaleStr = scale.steps
      .map((s, i) => `  ${scale.labels[i]}: ${s}px`)
      .join("\n");

    let result = `Type scale (base: ${base}px, ratio: ${typeof ratio === "string" ? ratio : ratio.toFixed(3)}):\n${scaleStr}`;
    if (applied.length > 0) {
      result += `\n\nApplied to layers:\n  ${applied.join("\n  ")}`;
    }

    return textResult(result);
  },
};

export const getFontMetricsTool: McpToolDefinition = {
  name: "get_font_metrics",
  description:
    "Return detailed metrics for a registered font: ascender, descender, xHeight, capHeight, " +
    "available weights, and kerning pair count.",
  inputSchema: {
    type: "object",
    properties: {
      fontFamily: {
        type: "string",
        description: "Font family name.",
      },
      weight: {
        type: "number",
        description: "Specific weight to query (default: 400).",
      },
    },
    required: ["fontFamily"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    _context: McpToolContext,
  ): Promise<McpToolResult> {
    const family = input.fontFamily as string;
    const weight = (input.weight as number) ?? 400;

    const loaded = getFont(family, weight);
    if (!loaded) {
      return errorResult(
        `Font '${family}' not found in registry. Use list_fonts to see available fonts, ` +
        `or load_custom_font to register a new one.`,
      );
    }

    const metrics = getMetrics(loaded.font);
    const pairs = extractKernPairs(loaded.font);

    const lines = [
      `Font: ${loaded.family} (weight: ${loaded.weight}, style: ${loaded.style}, source: ${loaded.source})`,
      `Units per em: ${metrics.unitsPerEm}`,
      `Ascender: ${metrics.ascender}`,
      `Descender: ${metrics.descender}`,
      `x-Height: ${metrics.xHeight}`,
      `Cap height: ${metrics.capHeight}`,
      `Line gap: ${metrics.lineGap}`,
      `Avg char width: ${metrics.avgCharWidth}`,
      `Kern pairs: ${pairs.length}`,
    ];

    return textResult(lines.join("\n"));
  },
};

export const analyzeTextSpacingTool: McpToolDefinition = {
  name: "analyze_text_spacing",
  description:
    "Analyze kerning quality of a text layer. Reports per-pair spacing, " +
    "flags problem pairs, and suggests adjustments.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: {
        type: "string",
        description: "ID of the text layer to analyze.",
      },
    },
    required: ["layerId"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);
    if (layer.type !== "typography:text")
      return errorResult(`Layer '${layerId}' is not a text layer.`);

    const text = (layer.properties.text as string) ?? "";
    if (text.length < 2) return textResult("Text too short for spacing analysis.");

    const fontFamily = (layer.properties.fontFamily as string) ?? "Inter";
    const fontWeight = parseInt((layer.properties.fontWeight as string) ?? "400", 10);
    const fontSize = (layer.properties.fontSize as number) ?? 48;

    const loaded = getFont(fontFamily, fontWeight);
    if (!loaded) {
      return errorResult(`Font '${fontFamily}' not loaded. Register it first with load_custom_font.`);
    }

    const metricsKern = getMetricsKerning(loaded.font, text);
    const opticalKern = getOpticalKerning(loaded.font, text, fontSize);

    const lines: string[] = [`Spacing analysis for "${text}" (${fontFamily} ${fontWeight}):\n`];
    const problems: string[] = [];

    for (let i = 0; i < text.length - 1; i++) {
      const pair = `${text[i]}${text[i + 1]}`;
      const mk = metricsKern[i] ?? 0;
      const ok = opticalKern[i] ?? 0;
      const diff = Math.abs(mk - ok);

      let flag = "";
      if (diff > 50) {
        flag = " ⚠ large metrics/optical divergence";
        problems.push(pair);
      }
      if (mk < -100) {
        flag += " ⚠ very tight metrics kerning";
        if (!problems.includes(pair)) problems.push(pair);
      }

      lines.push(`  ${pair}: metrics=${mk}, optical=${ok}${flag}`);
    }

    if (problems.length > 0) {
      lines.push(`\nProblem pairs: ${problems.join(", ")}`);
      lines.push("Consider using optical kerning for more even spacing.");
    } else {
      lines.push("\nNo significant spacing issues detected.");
    }

    return textResult(lines.join("\n"));
  },
};

export const convertTextToPathsTool: McpToolDefinition = {
  name: "convert_text_to_paths",
  description:
    "Convert a text layer to SVG path data for font-independent rendering. " +
    "Returns the path data without modifying the layer.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: {
        type: "string",
        description: "ID of the text layer to convert.",
      },
    },
    required: ["layerId"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);
    if (layer.type !== "typography:text")
      return errorResult(`Layer '${layerId}' is not a text layer.`);

    const text = (layer.properties.text as string) ?? "";
    if (!text) return errorResult("Layer has no text content.");

    const fontFamily = (layer.properties.fontFamily as string) ?? "Inter";
    const fontWeight = parseInt((layer.properties.fontWeight as string) ?? "400", 10);
    const fontSize = (layer.properties.fontSize as number) ?? 48;
    const kerning = (layer.properties.kerning as string) ?? "metrics";
    const opticalAlign = (layer.properties.opticalAlign as boolean) ?? true;
    const letterSpacing = (layer.properties.letterSpacing as number) ?? 0;
    const tracking = (layer.properties.tracking as number) ?? 0;

    const loaded = getFont(fontFamily, fontWeight);
    if (!loaded) {
      return errorResult(`Font '${fontFamily}' not loaded. Register it first with load_custom_font.`);
    }

    const result = textToPath(text, {
      font: loaded.font,
      fontSize,
      kerning: kerning as "metrics" | "optical" | "none",
      opticalAlign,
      letterSpacing,
      tracking,
    });

    const lines = [
      `Converted "${text}" to paths:`,
      `  Total width: ${Math.round(result.width)}px`,
      `  Total height: ${Math.round(result.height)}px`,
      `  Baseline: ${Math.round(result.baseline)}px`,
      `  Glyphs: ${result.glyphPaths.length}`,
      `  Combined path length: ${result.svgPath.length} chars`,
      "",
      `SVG path data:`,
      result.svgPath,
    ];

    return textResult(lines.join("\n"));
  },
};

export const loadCustomFontTool: McpToolDefinition = {
  name: "load_custom_font",
  description:
    "Load a custom font from a sketch asset (OTF/TTF/WOFF2). " +
    "Registers it for use in text layers and MCP tools.",
  inputSchema: {
    type: "object",
    properties: {
      assetId: {
        type: "string",
        description: "ID of the font asset in the sketch.",
      },
      family: {
        type: "string",
        description: "Override the font family name.",
      },
      weight: {
        type: "number",
        description: "Override the font weight (100–900).",
      },
    },
    required: ["assetId"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const assetId = input.assetId as string;
    const buffer = await context.resolveAsset(assetId);
    if (!buffer) {
      return errorResult(`Asset '${assetId}' not found.`);
    }

    try {
      const loaded = registerFont(
        buffer,
        {
          family: input.family as string | undefined,
          weight: input.weight as number | undefined,
        },
        "custom",
      );

      return textResult(
        `Loaded font: ${loaded.family} (weight: ${loaded.weight}, style: ${loaded.style}). ` +
        `Available in fontFamily selection.`,
      );
    } catch (err) {
      return errorResult(`Failed to parse font: ${(err as Error).message}`);
    }
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const typographyMcpTools: McpToolDefinition[] = [
  setTextTool,
  applyTextStyleTool,
  listFontsTool,
  setTextShadowTool,
  setTypeScaleTool,
  getFontMetricsTool,
  analyzeTextSpacingTool,
  convertTextToPathsTool,
  loadCustomFontTool,
];
