import { getMaxScore } from "./scoring";
import { ALL_SCORED_QUESTIONS } from "./questions";

/** The five-value tone scale, assignable to an arbitrary number of zones (D-07). */
export type ScaleTone = "low" | "low-mid" | "mid" | "mid-high" | "high";

export interface ScaleZone {
  upTo: number; // inclusive upper bound, raw score points, on the 0..max axis
  tone: ScaleTone;
  label: string; // display text, independent of `tone` — renaming one does not touch the other
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
 * encode a claim.
 *
 * **These three numbers are a go-live blocker.** William confirms or replaces them before real
 * patients see this page. There is no admin form and there will not be one — an "Admin-Configurable
 * Score Scale" phase (5.1 / SCALE-01..04) was inserted 2026-08-11 and cancelled 2026-08-12, because
 * the clinical brackets it was built around are fixed by the AOD medical director, not tunable.
 * Applying his answer means editing the `zones` array below and deploying. See
 * `.planning/REQUIREMENTS.md` §"Removed Requirements".
 *
 * This provisional marking is developer- and admin-facing only.
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
 * Returns the compiled-in scale. This stays synchronous and stays a constant: the DB-backed
 * variant lived in the cancelled Phase 5.1 (see PROVISIONAL_SCORE_SCALE above). The accessor is
 * kept rather than inlined because it is the single seam every consumer reads through — if the
 * scale ever does become configurable, only this body changes.
 *
 * Note the two axes are independent and only one of them is soft: the colour zones here are a
 * display choice, while the clinical brackets in `scoring.ts` (SCORE_BRACKETS) are fixed clinical
 * input and are deliberately not reachable from this shape.
 */
export function getScoreScale(): ScoreScale {
  return PROVISIONAL_SCORE_SCALE;
}
