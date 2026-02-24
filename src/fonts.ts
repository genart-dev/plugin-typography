/** Built-in font definitions available without custom font loading. */
export interface BuiltInFont {
  readonly family: string;
  readonly weights: readonly number[];
  readonly category: "sans-serif" | "monospace" | "serif" | "display";
}

export const BUILT_IN_FONTS: readonly BuiltInFont[] = [
  { family: "Inter", weights: [400, 700], category: "sans-serif" },
  { family: "JetBrains Mono", weights: [400], category: "monospace" },
  { family: "Georgia", weights: [400, 700], category: "serif" },
  { family: "Arial", weights: [400, 700], category: "sans-serif" },
  { family: "Helvetica", weights: [400, 700], category: "sans-serif" },
  { family: "Times New Roman", weights: [400, 700], category: "serif" },
  { family: "Courier New", weights: [400, 700], category: "monospace" },
  { family: "Verdana", weights: [400, 700], category: "sans-serif" },
] as const;

/** System font stack fallbacks by category. */
export const FONT_FALLBACKS: Record<string, string> = {
  "sans-serif": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  monospace: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  serif: "Georgia, 'Times New Roman', serif",
  display: "Inter, -apple-system, sans-serif",
};

/** Resolve a font family string with appropriate fallbacks. */
export function resolveFontStack(family: string): string {
  const font = BUILT_IN_FONTS.find((f) => f.family === family);
  if (!font) return `'${family}', sans-serif`;
  return `'${family}', ${FONT_FALLBACKS[font.category] ?? "sans-serif"}`;
}
