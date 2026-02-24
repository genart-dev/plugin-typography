import { describe, it, expect } from "vitest";
import typographyPlugin from "../src/index.js";

describe("typography plugin", () => {
  it("exports a valid DesignPlugin object", () => {
    expect(typographyPlugin.id).toBe("typography");
    expect(typographyPlugin.name).toBe("Typography");
    expect(typographyPlugin.version).toBe("0.1.0");
    expect(typographyPlugin.tier).toBe("free");
  });

  it("has one layer type", () => {
    expect(typographyPlugin.layerTypes).toHaveLength(1);
    expect(typographyPlugin.layerTypes[0]!.typeId).toBe("typography:text");
  });

  it("has four MCP tools", () => {
    expect(typographyPlugin.mcpTools).toHaveLength(4);
    const names = typographyPlugin.mcpTools.map((t) => t.name);
    expect(names).toContain("set_text");
    expect(names).toContain("apply_text_style");
    expect(names).toContain("list_fonts");
    expect(names).toContain("set_text_shadow");
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
