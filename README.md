# @genart-dev/plugin-typography

Typography design layer plugin for [genart.dev](https://genart.dev) — add text overlays to any sketch with customizable fonts, styles, alignment, stroke, and drop shadow. Includes MCP tools for AI-agent control.

Part of [genart.dev](https://genart.dev) — a generative art platform with an MCP server, desktop app, and IDE extensions.

## Install

```bash
npm install @genart-dev/plugin-typography
```

## Usage

```typescript
import typographyPlugin from "@genart-dev/plugin-typography";
import { createDefaultRegistry } from "@genart-dev/core";

// Register the plugin with a renderer registry
const registry = createDefaultRegistry();
registry.registerPlugin(typographyPlugin);

// Or access individual exports
import {
  textLayerType,
  typographyMcpTools,
  BUILT_IN_FONTS,
  resolveFontStack,
} from "@genart-dev/plugin-typography";
```

## Text Layer

Adds a `"typography:text"` layer type to the design layer system. Text is rendered at a specified canvas position with full styling control.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | string | `"Hello World"` | Text content |
| `fontFamily` | select | `"Inter"` | Font family |
| `fontSize` | number | `48` | Font size in pixels (1–1000) |
| `fontWeight` | select | `"400"` | `"400"` (Regular) or `"700"` (Bold) |
| `fontStyle` | select | `"normal"` | `"normal"` or `"italic"` |
| `color` | color | `"#ffffff"` | Text fill color |
| `align` | select | `"left"` | `"left"`, `"center"`, `"right"` |
| `baseline` | select | `"top"` | `"top"`, `"middle"`, `"bottom"` |
| `letterSpacing` | number | `0` | Letter spacing in pixels |
| `lineHeight` | number | `1.2` | Line height multiplier |
| `strokeColor` | color | `""` | Stroke color (empty = no stroke) |
| `strokeWidth` | number | `0` | Stroke width in pixels |
| `shadowColor` | color | `""` | Shadow color (empty = no shadow) |
| `shadowBlur` | number | `0` | Shadow blur radius |
| `shadowOffsetX` | number | `0` | Shadow X offset |
| `shadowOffsetY` | number | `0` | Shadow Y offset |

### Built-in Fonts

8 fonts available without custom loading:

| Family | Category | Weights |
|--------|----------|---------|
| Inter | sans-serif | 400, 700 |
| JetBrains Mono | monospace | 400 |
| Georgia | serif | 400, 700 |
| Arial | sans-serif | 400, 700 |
| Helvetica | sans-serif | 400, 700 |
| Times New Roman | serif | 400, 700 |
| Courier New | monospace | 400, 700 |
| Verdana | sans-serif | 400, 700 |

## MCP Tools (4)

Exposed to AI agents through the MCP server when this plugin is registered:

| Tool | Description |
|------|-------------|
| `set_text` | Add a text layer or update an existing one by layer ID |
| `apply_text_style` | Update font, size, weight, color, alignment on a text layer |
| `set_text_shadow` | Set drop shadow properties on a text layer |
| `list_fonts` | List all available built-in fonts with metadata |

## API Reference

### `textLayerType`

The `LayerTypeDefinition` for `"typography:text"` layers. Registered automatically when using `registry.registerPlugin(typographyPlugin)`.

### `BUILT_IN_FONTS`

```typescript
import { BUILT_IN_FONTS } from "@genart-dev/plugin-typography";

for (const font of BUILT_IN_FONTS) {
  console.log(font.family, font.category, font.weights);
}
```

### `resolveFontStack(family)`

Resolves a font family to a full CSS font stack with appropriate fallbacks:

```typescript
import { resolveFontStack } from "@genart-dev/plugin-typography";

resolveFontStack("Inter");
// → "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

resolveFontStack("JetBrains Mono");
// → "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace"
```

## Related Packages

| Package | Purpose |
|---------|---------|
| [`@genart-dev/core`](https://github.com/genart-dev/core) | Plugin host, layer system (dependency) |
| [`@genart-dev/mcp-server`](https://github.com/genart-dev/mcp-server) | MCP server that surfaces plugin tools to AI agents |

## Support

Questions, bugs, or feedback — [support@genart.dev](mailto:support@genart.dev) or [open an issue](https://github.com/genart-dev/plugin-typography/issues).

## License

MIT
