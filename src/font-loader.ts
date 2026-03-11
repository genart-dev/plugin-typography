/**
 * Font loading and registry using opentype.js.
 * Manages built-in bundled fonts and custom user-uploaded fonts.
 */

import opentype, { type Font } from "opentype.js";

export interface LoadedFont {
  family: string;
  weight: number;
  style: "normal" | "italic";
  font: Font;
  source: "built-in" | "custom";
}

/** Registry key format: "family|weight|style" */
function registryKey(family: string, weight: number, style: string = "normal"): string {
  return `${family.toLowerCase()}|${weight}|${style}`;
}

const fontRegistry = new Map<string, LoadedFont>();

/**
 * Parse and register a font from a binary buffer.
 */
export function registerFont(
  buffer: ArrayBuffer | Uint8Array,
  metadata?: { family?: string; weight?: number; style?: "normal" | "italic" },
  source: "built-in" | "custom" = "custom",
): LoadedFont {
  const arrayBuffer = buffer instanceof Uint8Array ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer;
  const font = opentype.parse(arrayBuffer);

  // Extract family from font tables if not provided
  const family = metadata?.family ?? font.names.fontFamily?.en ?? "Unknown";
  const weight = metadata?.weight ?? extractWeight(font);
  const style = metadata?.style ?? (isItalic(font) ? "italic" : "normal");

  const loaded: LoadedFont = { family, weight, style, font, source };
  const key = registryKey(family, weight, style);
  fontRegistry.set(key, loaded);

  return loaded;
}

/**
 * Load a font from a binary buffer without registering it.
 */
export function loadFont(
  buffer: ArrayBuffer | Uint8Array,
  metadata?: { family?: string; weight?: number },
): LoadedFont {
  const arrayBuffer = buffer instanceof Uint8Array ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer;
  const font = opentype.parse(arrayBuffer);

  const family = metadata?.family ?? font.names.fontFamily?.en ?? "Unknown";
  const weight = metadata?.weight ?? extractWeight(font);
  const style: "normal" | "italic" = isItalic(font) ? "italic" : "normal";

  return { family, weight, style, font, source: "custom" };
}

/**
 * Get a registered font by family, weight, and optional style.
 * Falls back to the closest available weight if exact match not found.
 */
export function getFont(
  family: string,
  weight: number = 400,
  style: string = "normal",
): LoadedFont | null {
  // Exact match
  const exact = fontRegistry.get(registryKey(family, weight, style));
  if (exact) return exact;

  // Find closest weight in same family and style
  const candidates: LoadedFont[] = [];
  for (const loaded of fontRegistry.values()) {
    if (loaded.family.toLowerCase() === family.toLowerCase() && loaded.style === style) {
      candidates.push(loaded);
    }
  }
  if (candidates.length === 0) return null;

  // Sort by weight distance
  candidates.sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight));
  return candidates[0] ?? null;
}

/**
 * List all registered fonts.
 */
export function listRegisteredFonts(): LoadedFont[] {
  return Array.from(fontRegistry.values());
}

/**
 * Clear all registered fonts.
 */
export function clearRegistry(): void {
  fontRegistry.clear();
}

/**
 * Get registry size.
 */
export function getRegistrySize(): number {
  return fontRegistry.size;
}

/** Extract font weight from OS/2 table or name. */
function extractWeight(font: Font): number {
  const os2 = (font.tables as Record<string, Record<string, number> | undefined>)["os2"];
  if (os2?.["usWeightClass"]) return os2["usWeightClass"];

  // Fallback: check font name
  const name = (font.names.fontSubfamily?.en ?? "").toLowerCase();
  if (name.includes("thin") || name.includes("hairline")) return 100;
  if (name.includes("extralight") || name.includes("ultralight")) return 200;
  if (name.includes("light")) return 300;
  if (name.includes("medium")) return 500;
  if (name.includes("semibold") || name.includes("demibold")) return 600;
  if (name.includes("extrabold") || name.includes("ultrabold")) return 800;
  if (name.includes("bold")) return 700;
  if (name.includes("black") || name.includes("heavy")) return 900;
  return 400;
}

/** Check if font is italic from name or OS/2 table. */
function isItalic(font: Font): boolean {
  const name = (font.names.fontSubfamily?.en ?? "").toLowerCase();
  if (name.includes("italic") || name.includes("oblique")) return true;
  const os2 = (font.tables as Record<string, Record<string, number> | undefined>)["os2"];
  if (os2?.["fsSelection"]) return (os2["fsSelection"] & 1) !== 0;
  return false;
}
