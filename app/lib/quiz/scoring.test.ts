import { describe, it, expect } from "vitest";
import { calculateTotalScore, getScoreBracket, scoreQuestion } from "./scoring";
import { ALL_SCORED_QUESTIONS, getQuestionById } from "./questions";
import type { QuizAnswers } from "./types";

/**
 * Pins Success Criterion 5 / D-04 (03-CONTEXT.md): the score and bracket are unchanged by
 * anything answered in medical history. `calculateTotalScore` is always called with
 * `ALL_SCORED_QUESTIONS`, which stays Parts 1-5 — this file proves that structurally (every
 * member has part <= 5, no Part 6 id sneaks in) AND behaviorally (identical answers, with and
 * without medical-history keys populated, produce an identical score and bracket) across all
 * three brackets.
 */

// Base Parts 1-5 answers scoring into the "0-2" bracket (total = 2).
const BASE_0_2: QuizAnswers = {
  symptoms_nasal: ["sneezing", "runny_nose"], // 2 points
  symptoms_eye: ["none"],
  symptoms_sinus: ["none"],
  timing_season: ["only_rarely"], // excluded from score
  timing_triggers: ["none"],
  severity_nasal_congestion: 0,
  severity_sneezing: 0,
  severity_runny_nose: 0,
  severity_nasal_itching: 0,
  severity_eye_itching: 0,
  impact_sleep: 0,
  impact_daily: 0,
  impact_concentrate: 0,
  impact_social: 0,
  bother_overall: 0,
  taking_meds: "no",
  diagnosed_allergic_condition: "no",
};

// Base Parts 1-5 answers scoring into the "3-6" bracket (total = 5: 2 from symptoms_nasal + 3
// from severity_nasal_congestion).
const BASE_3_6: QuizAnswers = {
  ...BASE_0_2,
  severity_nasal_congestion: 3,
};

// Base Parts 1-5 answers scoring into the "7+" bracket (total = 7: 3 from
// severity_nasal_congestion + 4 from impact_sleep, on top of the 2 from symptoms_nasal already
// present).
const BASE_7_PLUS: QuizAnswers = {
  ...BASE_3_6,
  impact_sleep: 4,
};

// Every new Part 6 (HIST-01..HIST-04) answer key plus DIAG-01, appended on top of a base answers
// object. Every field here is a yesno/text_input/checkbox_multi answer that, per D-04, must
// contribute exactly 0 to calculateTotalScore(ALL_SCORED_QUESTIONS, ...) because none of these
// ids belong to a Part <= 5 question in ALL_SCORED_QUESTIONS.
function withMedicalHistory(base: QuizAnswers): QuizAnswers {
  return {
    ...base,
    diagnosed_allergic_condition: "yes", // still Part 5, still 0 — asserted separately below too
    history_comorbidities: ["asthma", "copd", "cancer"],
    current_medications: "Cetirizine 10mg daily, Albuterol as needed",
    history_surgeries_has: "yes",
    history_surgeries: "Appendectomy, 2015",
    history_allergies_has: "yes",
    history_allergies: "Penicillin",
    history_conditions_has: "yes",
    history_conditions: "Hypertension",
    has_pcp: "yes",
    pcp_clinic_name: "Greenville Family Medicine",
    pcp_clinic_address: "123 Main St, Greenville, SC",
  };
}

describe("score parity across all three brackets (Success Criterion 5 / D-04)", () => {
  it("0-2 bracket: identical score and bracket with and without medical-history answers", () => {
    const scoreWithout = calculateTotalScore(ALL_SCORED_QUESTIONS, BASE_0_2);
    const scoreWith = calculateTotalScore(ALL_SCORED_QUESTIONS, withMedicalHistory(BASE_0_2));
    expect(scoreWith).toBe(scoreWithout);
    expect(getScoreBracket(scoreWith)).toBe(getScoreBracket(scoreWithout));
    expect(getScoreBracket(scoreWithout)).toBe("0-2");
  });

  it("3-6 bracket: identical score and bracket with and without medical-history answers", () => {
    const scoreWithout = calculateTotalScore(ALL_SCORED_QUESTIONS, BASE_3_6);
    const scoreWith = calculateTotalScore(ALL_SCORED_QUESTIONS, withMedicalHistory(BASE_3_6));
    expect(scoreWith).toBe(scoreWithout);
    expect(getScoreBracket(scoreWith)).toBe(getScoreBracket(scoreWithout));
    expect(getScoreBracket(scoreWithout)).toBe("3-6");
  });

  it("7+ bracket: identical score and bracket with and without medical-history answers", () => {
    const scoreWithout = calculateTotalScore(ALL_SCORED_QUESTIONS, BASE_7_PLUS);
    const scoreWith = calculateTotalScore(ALL_SCORED_QUESTIONS, withMedicalHistory(BASE_7_PLUS));
    expect(scoreWith).toBe(scoreWithout);
    expect(getScoreBracket(scoreWith)).toBe(getScoreBracket(scoreWithout));
    expect(getScoreBracket(scoreWithout)).toBe("7+");
  });
});

describe("structural guarantee: ALL_SCORED_QUESTIONS never gains a Part 6 member", () => {
  it("every member has part <= 5", () => {
    for (const question of ALL_SCORED_QUESTIONS) {
      expect(question.part).toBeLessThanOrEqual(5);
    }
  });

  const forbiddenIds = ["has_pcp", "current_medications", "pcp_clinic_name", "pcp_clinic_address"];

  it("contains zero items whose id starts with 'history_' or matches a Part 6 non-history id", () => {
    const offenders = ALL_SCORED_QUESTIONS.filter(
      (q) => q.id.startsWith("history_") || forbiddenIds.includes(q.id)
    );
    expect(offenders).toEqual([]);
  });
});

describe("DIAG-01 contributes zero to the score", () => {
  it("scoreQuestion returns 0 for diagnosed_allergic_condition regardless of answer", () => {
    const question = getQuestionById("diagnosed_allergic_condition")!;
    expect(scoreQuestion(question, "yes")).toBe(0);
    expect(scoreQuestion(question, "no")).toBe(0);
  });
});
