import { getMaxScore, SCORE_BRACKETS } from "./scoring";
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
}

/** SCORE-02's derived ceiling. Also the last zone's upper bound, so the two cannot drift apart. */
const DERIVED_MAX = getMaxScore(ALL_SCORED_QUESTIONS);

/**
 * The zone boundaries ARE the clinical bracket boundaries, read from `SCORE_BRACKETS` rather than
 * retyped as literals. Andrew chose this on 2026-08-12 after reviewing the shipped page against a
 * live preview: one colour per bracket, boundaries identical, no independent colour numbers to
 * maintain or to ask William about.
 *
 * **This reverses D-05** (`05-CONTEXT.md`), which decoupled colour from the brackets precisely
 * because `7+` spans 54 of the 60 possible points. That reasoning was not wrong and is not
 * discarded — it is answered instead by how the bar RENDERS. `ResultsDisplay` gives every zone an
 * equal share of the track and interpolates the marker inside its own zone, so the red zone is one
 * third of the bar rather than 90% of it, and a patient at 7 sits at the far-left edge of red while
 * one at 60 sits at the far right. Position still carries ordering; it just no longer carries a
 * linear reading of the raw score. Do not "fix" the equal-share rendering back to
 * span-proportional widths without reading that section of ResultsDisplay first — proportional
 * widths plus these boundaries is the 90%-red outcome D-05 warned about, and is the one
 * combination nobody chose.
 *
 * Derived, not literal, for a second reason: if the medical director ever revises the brackets,
 * the colours follow in the same commit. There is no second set of numbers to forget.
 *
 * **Confirmed 2026-08-13.** William Miller, the AOD medical director, confirmed this presentation
 * in reply to the question sent 2026-08-12: colour tracks the clinical brackets 1:1, three
 * equal-width bands, and most patients rendering red is clinically intended (see
 * `.planning/phases/05.2-clinical-bracket-revision/05.2-SOURCE-william-2026-08-13.md`). The
 * `PROVISIONAL_SCORE_SCALE` constant name is retained only to avoid a phase-wide rename across
 * every consumer — it is no longer provisional in fact. There is no admin form and there will not
 * be one: an "Admin-Configurable Score Scale" phase (5.1 / SCALE-01..04) was inserted 2026-08-11
 * and cancelled 2026-08-12, because the clinical brackets it was built around are fixed, not
 * tunable. See `.planning/REQUIREMENTS.md` §"Removed Requirements".
 */
export const PROVISIONAL_SCORE_SCALE: ScoreScale = {
  max: getMaxScore(ALL_SCORED_QUESTIONS),
  zones: [
    { upTo: SCORE_BRACKETS.LOW.max, tone: "low", label: "Low" },
    { upTo: SCORE_BRACKETS.MID.max, tone: "mid", label: "Moderate" },
    // SCORE_BRACKETS.HIGH.max is Infinity — an open-ended clinical bracket. The bar needs a finite
    // right edge, so the top zone closes at the derived ceiling instead.
    { upTo: DERIVED_MAX, tone: "high", label: "High" },
  ],
};

/**
 * Returns the compiled-in scale. This stays synchronous and stays a constant: the DB-backed
 * variant lived in the cancelled Phase 5.1 (see PROVISIONAL_SCORE_SCALE above). The accessor is
 * kept rather than inlined because it is the single seam every consumer reads through — if the
 * scale ever does become configurable, only this body changes.
 */
export function getScoreScale(): ScoreScale {
  return PROVISIONAL_SCORE_SCALE;
}
