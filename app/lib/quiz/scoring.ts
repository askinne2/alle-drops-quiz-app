/**
 * Quiz scoring logic
 * Migrated from symptom-quiz.js SCORE_THRESHOLDS and SEVERITY_WEIGHTS
 */

export const SCORE_THRESHOLDS = {
  minimal: { min: 0, max: 4 },
  mild: { min: 5, max: 9 },
  moderate: { min: 10, max: 19 },
  severe: { min: 20, max: 60 },
} as const;

export const SEVERITY_WEIGHTS = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
} as const;

export type SeverityLevel = "minimal" | "mild" | "moderate" | "severe";
export type SeverityWeight = keyof typeof SEVERITY_WEIGHTS;

/**
 * Calculate total quiz score from responses
 * @param responses - Object mapping question IDs to severity values (0-3)
 * @returns Total score (0-60)
 */
export function calculateScore(responses: Record<string, number>): number {
  return Object.values(responses).reduce((sum, value) => sum + value, 0);
}

/**
 * Determine severity level from score
 * @param score - Total quiz score
 * @returns Severity level
 */
export function determineSeverityLevel(score: number): SeverityLevel {
  if (score >= SCORE_THRESHOLDS.severe.min) {
    return "severe";
  } else if (score >= SCORE_THRESHOLDS.moderate.min) {
    return "moderate";
  } else if (score >= SCORE_THRESHOLDS.mild.min) {
    return "mild";
  } else {
    return "minimal";
  }
}

/**
 * Generate symptom profile ID
 * Format: AOD_TIMESTAMP
 */
export function generateSymptomProfileId(): string {
  return `AOD_${Date.now()}`;
}



