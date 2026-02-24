import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { textLayerType } from "./text-layer.js";
import { typographyMcpTools } from "./text-tools.js";

const typographyPlugin: DesignPlugin = {
  id: "typography",
  name: "Typography",
  version: "0.1.0",
  tier: "free",
  description: "Text layers with customizable fonts, styles, stroke, and shadow.",

  layerTypes: [textLayerType],
  tools: [],
  exportHandlers: [],
  mcpTools: typographyMcpTools,

  async initialize(_context: PluginContext): Promise<void> {
    // No async setup needed for built-in fonts
  },

  dispose(): void {
    // No resources to release
  },
};

export default typographyPlugin;
export { textLayerType } from "./text-layer.js";
export { typographyMcpTools } from "./text-tools.js";
export { BUILT_IN_FONTS, resolveFontStack } from "./fonts.js";
