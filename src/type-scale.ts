/**
 * Modular type scale calculator.
 * Generates harmonious font size progressions from a base size and ratio.
 */

export type ScaleRatio =
  | "minor-second"
  | "major-second"
  | "minor-third"
  | "major-third"
  | "perfect-fourth"
  | "augmented-fourth"
  | "perfect-fifth"
  | "golden";

export const SCALE_RATIOS: Record<ScaleRatio, number> = {
  "minor-second": 1.067,
  "major-second": 1.125,
  "minor-third": 1.2,
  "major-third": 1.25,
  "perfect-fourth": 1.333,
  "augmented-fourth": 1.414,
  "perfect-fifth": 1.5,
  golden: 1.618,
};

const DEFAULT_LABELS = [
  "caption",
  "small",
  "body",
  "h4",
  "h3",
  "h2",
  "h1",
  "display-sm",
  "display",
  "display-lg",
];

export interface TypeScale {
  base: number;
  ratio: number;
  steps: number[];
  labels: string[];
}

/**
 * Generate a modular type scale.
 * @param base - Base font size in pixels
 * @param ratio - Named ratio or custom numeric ratio
 * @param stepsUp - Number of steps above the base (default 4)
 * @param stepsDown - Number of steps below the base (default 2)
 */
export function generateScale(
  base: number,
  ratio: ScaleRatio | number,
  stepsUp: number = 4,
  stepsDown: number = 2,
): TypeScale {
  const r = typeof ratio === "string" ? SCALE_RATIOS[ratio] : ratio;
  if (r <= 0) throw new Error("Ratio must be positive");
  if (base <= 0) throw new Error("Base size must be positive");

  const steps: number[] = [];

  // Generate steps below base
  for (let i = -stepsDown; i < 0; i++) {
    steps.push(Math.round(base * Math.pow(r, i)));
  }

  // Base step
  steps.push(Math.round(base));

  // Generate steps above base
  for (let i = 1; i <= stepsUp; i++) {
    steps.push(Math.round(base * Math.pow(r, i)));
  }

  // Assign labels (center on base)
  const totalSteps = steps.length;
  const labels: string[] = [];
  for (let i = 0; i < totalSteps; i++) {
    labels.push(DEFAULT_LABELS[i] ?? `step-${i}`);
  }

  return { base, ratio: r, steps, labels };
}

/**
 * Suggest a scale ratio that best fits a desired body→display progression.
 * @param bodySize - Desired body text size
 * @param displaySize - Desired largest display size
 * @returns Best matching ratio and number of steps
 */
export function suggestScale(
  bodySize: number,
  displaySize: number,
): { ratio: ScaleRatio; steps: number } {
  if (displaySize <= bodySize) {
    return { ratio: "minor-second", steps: 1 };
  }

  let bestRatio: ScaleRatio = "minor-second";
  let bestSteps = 1;
  let bestError = Infinity;

  for (const [name, r] of Object.entries(SCALE_RATIOS) as [ScaleRatio, number][]) {
    // Find how many steps to reach displaySize from bodySize
    const stepsNeeded = Math.log(displaySize / bodySize) / Math.log(r);
    const roundedSteps = Math.round(stepsNeeded);
    if (roundedSteps < 1) continue;

    const achieved = bodySize * Math.pow(r, roundedSteps);
    const error = Math.abs(achieved - displaySize) / displaySize;

    if (error < bestError) {
      bestError = error;
      bestRatio = name;
      bestSteps = roundedSteps;
    }
  }

  return { ratio: bestRatio, steps: bestSteps };
}
