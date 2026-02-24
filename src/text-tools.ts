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

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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
      if (input.fontSize !== undefined) updates.fontSize = input.fontSize;
      if (input.fontFamily !== undefined) updates.fontFamily = input.fontFamily;
      if (input.color !== undefined) updates.color = input.color;
      if (input.align !== undefined) updates.align = input.align;

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
    const properties = {
      ...defaults,
      text,
      ...(input.fontSize !== undefined && { fontSize: input.fontSize }),
      ...(input.fontFamily !== undefined && { fontFamily: input.fontFamily }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.align !== undefined && { align: input.align }),
    };

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
      properties,
    };

    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(`Created text layer '${id}' with text "${text}".`);
  },
};

export const applyTextStyleTool: McpToolDefinition = {
  name: "apply_text_style",
  description:
    "Apply styling to an existing text layer: font, size, weight, color, stroke, shadow.",
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
        enum: ["400", "700"],
        description: "Font weight.",
      },
      fontStyle: {
        type: "string",
        enum: ["normal", "italic"],
        description: "Font style.",
      },
      color: { type: "string", description: "Fill color (hex)." },
      lineHeight: { type: "number", description: "Line height multiplier." },
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
  description: "List all available built-in fonts with their weights and categories.",
  inputSchema: {
    type: "object",
    properties: {},
  } satisfies JsonSchema,

  async handler(
    _input: Record<string, unknown>,
    _context: McpToolContext,
  ): Promise<McpToolResult> {
    const lines = BUILT_IN_FONTS.map(
      (f) => `• ${f.family} — weights: ${f.weights.join(", ")} (${f.category})`,
    );
    return textResult(`Available fonts:\n${lines.join("\n")}`);
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

export const typographyMcpTools: McpToolDefinition[] = [
  setTextTool,
  applyTextStyleTool,
  listFontsTool,
  setTextShadowTool,
];
