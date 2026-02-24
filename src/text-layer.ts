import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
  ValidationError,
} from "@genart-dev/core";
import { renderText } from "./text-render.js";
import { BUILT_IN_FONTS } from "./fonts.js";

const TEXT_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "text",
    label: "Text",
    type: "string",
    default: "Hello World",
    group: "content",
  },
  {
    key: "fontFamily",
    label: "Font Family",
    type: "select",
    default: "Inter",
    group: "font",
    options: BUILT_IN_FONTS.map((f) => ({ value: f.family, label: f.family })),
  },
  {
    key: "fontSize",
    label: "Font Size",
    type: "number",
    default: 48,
    min: 1,
    max: 1000,
    step: 1,
    group: "font",
  },
  {
    key: "fontWeight",
    label: "Font Weight",
    type: "select",
    default: "400",
    group: "font",
    options: [
      { value: "400", label: "Regular" },
      { value: "700", label: "Bold" },
    ],
  },
  {
    key: "fontStyle",
    label: "Font Style",
    type: "select",
    default: "normal",
    group: "font",
    options: [
      { value: "normal", label: "Normal" },
      { value: "italic", label: "Italic" },
    ],
  },
  {
    key: "color",
    label: "Color",
    type: "color",
    default: "#ffffff",
    group: "style",
  },
  {
    key: "align",
    label: "Alignment",
    type: "select",
    default: "left",
    group: "layout",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
  },
  {
    key: "baseline",
    label: "Baseline",
    type: "select",
    default: "top",
    group: "layout",
    options: [
      { value: "top", label: "Top" },
      { value: "middle", label: "Middle" },
      { value: "alphabetic", label: "Alphabetic" },
      { value: "bottom", label: "Bottom" },
    ],
  },
  {
    key: "lineHeight",
    label: "Line Height",
    type: "number",
    default: 1.2,
    min: 0.5,
    max: 5,
    step: 0.1,
    group: "layout",
  },
  {
    key: "strokeEnabled",
    label: "Stroke Enabled",
    type: "boolean",
    default: false,
    group: "stroke",
  },
  {
    key: "strokeColor",
    label: "Stroke Color",
    type: "color",
    default: "#000000",
    group: "stroke",
  },
  {
    key: "strokeWidth",
    label: "Stroke Width",
    type: "number",
    default: 2,
    min: 0,
    max: 50,
    step: 0.5,
    group: "stroke",
  },
  {
    key: "shadowEnabled",
    label: "Shadow Enabled",
    type: "boolean",
    default: false,
    group: "shadow",
  },
  {
    key: "shadowColor",
    label: "Shadow Color",
    type: "color",
    default: "rgba(0,0,0,0.5)",
    group: "shadow",
  },
  {
    key: "shadowBlur",
    label: "Shadow Blur",
    type: "number",
    default: 4,
    min: 0,
    max: 100,
    step: 1,
    group: "shadow",
  },
  {
    key: "shadowOffsetX",
    label: "Shadow Offset X",
    type: "number",
    default: 2,
    min: -100,
    max: 100,
    step: 1,
    group: "shadow",
  },
  {
    key: "shadowOffsetY",
    label: "Shadow Offset Y",
    type: "number",
    default: 2,
    min: -100,
    max: 100,
    step: 1,
    group: "shadow",
  },
];

export const textLayerType: LayerTypeDefinition = {
  typeId: "typography:text",
  displayName: "Text",
  icon: "type",
  category: "text",
  properties: TEXT_PROPERTIES,
  propertyEditorId: "typography:text-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of TEXT_PROPERTIES) {
      props[schema.key] = schema.default;
    }
    return props;
  },

  render(
    properties: LayerProperties,
    ctx: CanvasRenderingContext2D,
    bounds: LayerBounds,
    _resources: RenderResources,
  ): void {
    renderText(properties, ctx, bounds);
  },

  renderSVG(
    properties: LayerProperties,
    bounds: LayerBounds,
    _resources: RenderResources,
  ): string {
    const text = (properties.text as string) ?? "";
    const fontSize = (properties.fontSize as number) ?? 48;
    const fontFamily = (properties.fontFamily as string) ?? "Inter";
    const fontWeight = (properties.fontWeight as string) ?? "400";
    const fontStyle = (properties.fontStyle as string) ?? "normal";
    const color = (properties.color as string) ?? "#ffffff";
    const align = (properties.align as string) ?? "left";

    let textAnchor = "start";
    let x = bounds.x;
    if (align === "center") {
      textAnchor = "middle";
      x = bounds.x + bounds.width / 2;
    } else if (align === "right") {
      textAnchor = "end";
      x = bounds.x + bounds.width;
    }

    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<text x="${x}" y="${bounds.y + fontSize}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${color}" text-anchor="${textAnchor}">${escaped}</text>`;
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];

    if (typeof properties.text !== "string") {
      errors.push({ property: "text", message: "Text must be a string" });
    }

    const fontSize = properties.fontSize;
    if (typeof fontSize !== "number" || fontSize < 1 || fontSize > 1000) {
      errors.push({
        property: "fontSize",
        message: "Font size must be a number between 1 and 1000",
      });
    }

    const fontWeight = properties.fontWeight;
    if (fontWeight !== "400" && fontWeight !== "700") {
      errors.push({
        property: "fontWeight",
        message: "Font weight must be '400' or '700'",
      });
    }

    return errors.length > 0 ? errors : null;
  },
};
