import { getMaxScore } from "./scoring";
import { ALL_SCORED_QUESTIONS } from "./questions";

/** The five-value tone scale Phase 5.1's admin form can assign to an arbitrary number of zones. */
export type ScaleTone = "low" | "low-mid" | "mid" | "mid-high" | "high";

export interface ScaleZone {
  upTo: number; // inclusive upper bound, raw score points, on the 0..max axis
  tone: ScaleTone;
  label: string; // display text, independent of `tone` (Phase 5.1 can rename display text later)
}

export interface ScoreScale {
  max: number; // SCORE-02's derived ceiling — computed via getMaxScore, never a literal
  zones: ScaleZone[]; // ascending upTo; first zone implicitly starts at 0; last zone's upTo === max
  isProvisional: true; // D-04's code-visibility requirement, developer/admin-facing only — never
  // rendered to the patient as a banner, badge, or copy. Typed as the literal `true` so a future
  // non-provisional scale cannot be assigned to this shape by accident.
}

/**
 * PROVISIONAL — see D-04 (05-CONTEXT.md). Equal thirds of the derived 0-60 range, chosen because
 * this default needs no clinical justification of its own: D-05 already decoupled the bar's
 * color from the clinical brackets, so this default's only job is to show linear position, not
 * encode a claim. William confirms or replaces these three numbers via Phase 5.1's admin form
 * before go-live. This marking is developer- and admin-facing only.
 */
export const PROVISIONAL_SCORE_SCALE: ScoreScale = {
  max: getMaxScore(ALL_SCORED_QUESTIONS),
  isProvisional: true,
  zones: [
    { upTo: 20, tone: "low", label: "Low" },
    { upTo: 40, tone: "mid", label: "Moderate" },
    { upTo: 60, tone: "high", label: "High" },
  ],
};

/**
 * Phase 5: returns the compiled-in provisional constant — no config channel exists yet. Phase
 * 5.1 swaps this implementation to read a DB-backed setting with this same return shape, falling
 * back to PROVISIONAL_SCORE_SCALE on fetch failure; ResultsDisplay's call site does not change.
 */
export function getScoreScale(): ScoreScale {
  return PROVISIONAL_SCORE_SCALE;
}
