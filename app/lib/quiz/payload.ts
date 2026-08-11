import { visibleAnswers } from "./schema";
import { ALL_ITEMS, ALL_SCORED_QUESTIONS } from "./questions";
import { calculateTotalScore, getScoreBracket, type ScoreBracket } from "./scoring";
import { type QuizAnswers } from "./types";
import { CONSENT_VERSION } from "../consent-version";

/**
 * Patient identity fields as held in `QuizContainer`'s `patientInfo` state (`PatientInfoValues`
 * shape, reproduced by value here rather than imported to keep this module's public surface
 * self-describing — see `PatientInfoStep.tsx` for the source of truth on validation).
 */
export interface SubmitPayloadInput {
  patientState: "tennessee" | "texas" | null;
  patientInfo: { name: string; dob: string; email: string; phone: string };
  symptomProfileId: string | null;
  /** RAW answers — every visible-answer filtering happens inside this function, never before it
   *  is called. Do not pre-filter with `visibleAnswers` at the call site (see the module doc
   *  comment below). */
  answers: QuizAnswers;
  score: number | null;
  scoreBracket: ScoreBracket | null;
  startTime: number;
}

export interface SubmitPayload {
  state: "tennessee" | "texas";
  name: string;
  dob: string;
  email: string;
  phone: string;
  symptom_profile_id: string;
  quiz_score: number;
  score_bracket: ScoreBracket;
  quiz_date: string;
  answers: QuizAnswers;
  completion_time: number;
  consent_version: string;
}

/**
 * D-10 / ROADMAP success criterion 5: the fields legitimately allowed to differ between a
 * one-sitting submit and a resumed submit, and ONLY these three. Each is time-derived, not
 * clinical:
 *
 *   - `completion_time` is measured from `startTime`, which `QuizContainer` re-initializes with
 *     `useState(() => Date.now())` on every mount by design — a resumed session starts a fresh
 *     clock the moment the patient returns, so elapsed time necessarily differs from a
 *     one-sitting completion.
 *   - `quiz_date` is `new Date().toISOString()` taken at the moment `buildSubmitPayload` runs —
 *     the actual wall-clock submit time, which is never the same twice.
 *   - `symptom_profile_id` comes from `generateSymptomProfileId()`
 *     (`app/lib/quiz/scoring.ts:90-92`, `` `AOD_${Date.now()}` ``) — time-derived exactly like
 *     the other two, generated once at `PatientInfoStep`'s Next handler and carried through the
 *     rest of the flow (or, on resume, restored from the draft rather than regenerated — either
 *     way it is not clinical data).
 *
 * This list is closed at exactly three members and is asserted to be so by
 * `payload.test.ts`. Every other key in `SubmitPayload` — including `quiz_score` and
 * `score_bracket`, the two values ROADMAP criterion 5 explicitly names — MUST be identical
 * between a resumed and a one-sitting submit given the same answers. Adding a fourth entry here
 * is a scope change that requires Andrew's sign-off: widening this list is the one edit that
 * would make a failing D-10 parity test pass without actually fixing a real divergence.
 */
export const RESUME_PARITY_EXCLUDED_FIELDS = [
  "completion_time",
  "quiz_date",
  "symptom_profile_id",
] as const;

/**
 * Builds the exact object POSTed to `/api/quiz/submit`. Pure extraction of
 * `QuizContainer.tsx`'s former inline `buildPayload` `useCallback` (see git history for the
 * pre-extraction version) — this is now the ONLY construction site for the submit payload, so
 * the one-sitting and resumed paths cannot diverge by having two implementations (T-4.2-05).
 *
 * Takes RAW `answers` and applies `visibleAnswers(ALL_ITEMS, answers)` internally. Do not accept
 * pre-filtered answers as input — the D-03 boundary filter must live on exactly one side of this
 * function's boundary, or the resumed and one-sitting paths could apply it differently and
 * silently disagree on what counts as "visible."
 *
 * Score and bracket are recomputed from `answers` via `calculateTotalScore` /
 * `getScoreBracket` whenever `score` / `scoreBracket` are `null` — matching
 * `QuizContainer.tsx`'s original `??` fallback behavior exactly. When non-null values are
 * supplied they are passed through unchanged; this function does not re-validate them. D-10
 * safety therefore depends on nothing upstream ever restoring a stale, persisted score into
 * `QuizContainer` state — enforced by `draft-store.ts` not having a `score` field on `QuizDraft`
 * at all, not by anything in this module.
 *
 * Throws `Error("Missing patient context")` when `patientState` or `symptomProfileId` is falsy,
 * reproducing the original guard verbatim.
 *
 * No console logging anywhere in this file. This function handles name, dob, email, phone, and
 * answers — all PHI (CLAUDE.md rule 5) — and must never log them.
 */
export function buildSubmitPayload(input: SubmitPayloadInput): SubmitPayload {
  const { patientState, patientInfo, symptomProfileId, answers, score, scoreBracket, startTime } =
    input;
  if (!patientState || !symptomProfileId) throw new Error("Missing patient context");
  const visible = visibleAnswers(ALL_ITEMS, answers);
  const s = score ?? calculateTotalScore(ALL_SCORED_QUESTIONS, visible);
  const b = scoreBracket ?? getScoreBracket(s);
  return {
    state: patientState,
    name: patientInfo.name.trim(),
    dob: patientInfo.dob,
    email: patientInfo.email.trim(),
    phone: patientInfo.phone,
    symptom_profile_id: symptomProfileId,
    quiz_score: s,
    score_bracket: b,
    quiz_date: new Date().toISOString(),
    answers: visible,
    completion_time: Math.round((Date.now() - startTime) / 1000),
    consent_version: CONSENT_VERSION,
  };
}
