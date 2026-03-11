import { describe, it, expect } from "vitest";
import typographyPlugin from "../src/index.js";

describe("typography plugin", () => {
  it("exports a valid DesignPlugin object", () => {
    expect(typographyPlugin.id).toBe("typography");
    expect(typographyPlugin.name).toBe("Typography");
    expect(typographyPlugin.version).toBe("0.2.0");
    expect(typographyPlugin.tier).toBe("free");
  });

  it("has one layer type", () => {
    expect(typographyPlugin.layerTypes).toHaveLength(1);
    expect(typographyPlugin.layerTypes[0]!.typeId).toBe("typography:text");
  });

  it("has nine MCP tools", () => {
    expect(typographyPlugin.mcpTools).toHaveLength(9);
    const names = typographyPlugin.mcpTools.map((t) => t.name);
    expect(names).toContain("set_text");
    expect(names).toContain("apply_text_style");
    expect(names).toContain("list_fonts");
    expect(names).toContain("set_text_shadow");
    expect(names).toContain("set_type_scale");
    expect(names).toContain("get_font_metrics");
    expect(names).toContain("analyze_text_spacing");
    expect(names).toContain("convert_text_to_paths");
    expect(names).toContain("load_custom_font");
  });

  it("has no interactive tools or export handlers", () => {
    expect(typographyPlugin.tools).toHaveLength(0);
    expect(typographyPlugin.exportHandlers).toHaveLength(0);
  });

  it("initialize and dispose are callable", async () => {
    const mockCtx = {
      registerComponent: () => {},
      registerAsset: () => {},
      log: { info: () => {}, warn: () => {}, error: () => {} },
      host: { surface: "mcp" as const, supportsInteractiveTools: false, supportsRendering: false },
    };
    await expect(typographyPlugin.initialize(mockCtx)).resolves.toBeUndefined();
    expect(() => typographyPlugin.dispose()).not.toThrow();
  });
});
