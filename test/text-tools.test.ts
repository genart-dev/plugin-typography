import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setTextTool,
  applyTextStyleTool,
  listFontsTool,
  setTextShadowTool,
} from "../src/text-tools.js";
import type {
  McpToolContext,
  DesignLayer,
  LayerStackAccessor,
} from "@genart-dev/core";

function createMockLayer(overrides: Partial<DesignLayer> = {}): DesignLayer {
  return {
    id: "layer-1",
    type: "typography:text",
    name: "Test Text",
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal",
    transform: {
      x: 50,
      y: 50,
      width: 400,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0,
      anchorY: 0,
    },
    properties: {
      text: "Hello",
      fontFamily: "Inter",
      fontSize: 48,
      fontWeight: "400",
      color: "#ffffff",
    },
    ...overrides,
  };
}

function createMockContext(layers: DesignLayer[] = []): McpToolContext {
  const layerMap = new Map(layers.map((l) => [l.id, l]));

  const accessor: LayerStackAccessor = {
    getAll: () => layers,
    get: (id: string) => layerMap.get(id) ?? null,
    add: vi.fn((layer: DesignLayer) => {
      layers.push(layer);
      layerMap.set(layer.id, layer);
    }),
    remove: vi.fn(),
    updateProperties: vi.fn(),
    updateTransform: vi.fn(),
    updateBlend: vi.fn(),
    reorder: vi.fn(),
    duplicate: vi.fn(() => "dup-id"),
    count: layers.length,
  };

  return {
    layers: accessor,
    sketchState: {
      seed: 42,
      params: {},
      colorPalette: ["#ff0000", "#00ff00"],
      canvasWidth: 800,
      canvasHeight: 600,
      rendererId: "canvas2d",
    },
    canvasWidth: 800,
    canvasHeight: 600,
    resolveAsset: vi.fn(async () => null),
    captureComposite: vi.fn(async () => Buffer.from("")),
    emitChange: vi.fn(),
  };
}

describe("set_text tool", () => {
  it("creates a new text layer when no layerId given", async () => {
    const ctx = createMockContext();
    const result = await setTextTool.handler({ text: "New text" }, ctx);

    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.type).toBe("text");
    expect((result.content[0] as { text: string }).text).toContain("Created text layer");
    expect(ctx.layers.add).toHaveBeenCalled();
    expect(ctx.emitChange).toHaveBeenCalledWith("layer-added");
  });

  it("creates layer with custom position and style", async () => {
    const ctx = createMockContext();
    await setTextTool.handler(
      { text: "Custom", x: 100, y: 200, fontSize: 72, color: "#ff0000" },
      ctx,
    );

    const addCall = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const layer = addCall[0] as DesignLayer;
    expect(layer.transform.x).toBe(100);
    expect(layer.transform.y).toBe(200);
    expect(layer.properties.fontSize).toBe(72);
    expect(layer.properties.color).toBe("#ff0000");
  });

  it("updates existing text layer", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await setTextTool.handler(
      { layerId: "layer-1", text: "Updated" },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    expect(ctx.layers.updateProperties).toHaveBeenCalledWith("layer-1", {
      text: "Updated",
    });
    expect(ctx.emitChange).toHaveBeenCalledWith("layer-updated");
  });

  it("returns error for non-existent layer", async () => {
    const ctx = createMockContext();
    const result = await setTextTool.handler(
      { layerId: "missing", text: "Test" },
      ctx,
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain("not found");
  });

  it("returns error for non-text layer", async () => {
    const layer = createMockLayer({ type: "filter:grain" });
    const ctx = createMockContext([layer]);
    const result = await setTextTool.handler(
      { layerId: "layer-1", text: "Test" },
      ctx,
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain("not a text layer");
  });
});

describe("apply_text_style tool", () => {
  it("applies style properties to a text layer", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await applyTextStyleTool.handler(
      { layerId: "layer-1", fontSize: 72, fontWeight: "700", color: "#ff0000" },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    expect(ctx.layers.updateProperties).toHaveBeenCalledWith("layer-1", {
      fontSize: 72,
      fontWeight: "700",
      color: "#ff0000",
    });
  });

  it("returns error with no style properties", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await applyTextStyleTool.handler(
      { layerId: "layer-1" },
      ctx,
    );

    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain("No style properties");
  });
});

describe("list_fonts tool", () => {
  it("returns list of available fonts", async () => {
    const ctx = createMockContext();
    const result = await listFontsTool.handler({}, ctx);

    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Inter");
    expect(text).toContain("JetBrains Mono");
    expect(text).toContain("Georgia");
  });
});

describe("set_text_shadow tool", () => {
  it("enables shadow with config", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await setTextShadowTool.handler(
      {
        layerId: "layer-1",
        enabled: true,
        color: "#000000",
        blur: 8,
        offsetX: 3,
        offsetY: 3,
      },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    expect(ctx.layers.updateProperties).toHaveBeenCalledWith("layer-1", {
      shadowEnabled: true,
      shadowColor: "#000000",
      shadowBlur: 8,
      shadowOffsetX: 3,
      shadowOffsetY: 3,
    });
  });

  it("disables shadow", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await setTextShadowTool.handler(
      { layerId: "layer-1", enabled: false },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    expect((result.content[0] as { text: string }).text).toContain("disabled");
  });
});
