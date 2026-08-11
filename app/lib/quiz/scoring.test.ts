import { describe, it, expect } from "vitest";
import {
  calculateTotalScore,
  getScoreBracket,
  scoreQuestion,
  getQuestionMaxScore,
  getMaxScore,
} from "./scoring";
import { ALL_SCORED_QUESTIONS, getQuestionById } from "./questions";
import type { QuizAnswers, QuizQuestion } from "./types";

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

/**
 * Builds a synthetic QuizQuestion for exercising a single getQuestionMaxScore branch in
 * isolation. A synthetic question proves the branch; a real fixture copied out of questions.ts
 * would only prove that one existing question happens to work.
 */
function makeQuestion(type: QuizQuestion["type"], extra: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    kind: "question",
    id: "synthetic",
    type,
    text: "synthetic",
    order: 1,
    part: 1,
    ...extra,
  };
}

describe("SCORE-02: the score ceiling is derived from ALL_SCORED_QUESTIONS, not hardcoded", () => {
  it("getMaxScore(ALL_SCORED_QUESTIONS) is 60", () => {
    expect(getMaxScore(ALL_SCORED_QUESTIONS)).toBe(60);
  });

  it("ALL_SCORED_QUESTIONS has 19 members, 16 of which have getQuestionMaxScore > 0", () => {
    expect(ALL_SCORED_QUESTIONS.length).toBe(19);
    const contributing = ALL_SCORED_QUESTIONS.filter((q) => getQuestionMaxScore(q) > 0);
    expect(contributing.length).toBe(16);
  });

  it("adding a synthetic severity_0_3 question raises the ceiling by exactly 3 (proves derivation, not a static 60)", () => {
    const withExtra = getMaxScore([...ALL_SCORED_QUESTIONS, makeQuestion("severity_0_3")]);
    expect(withExtra).toBe(getMaxScore(ALL_SCORED_QUESTIONS) + 3);
  });
});

describe("getQuestionMaxScore: every QuestionType branch is individually correct (drift guard)", () => {
  it("checkbox_multi returns the count of non-excluded options", () => {
    const q = makeQuestion("checkbox_multi", {
      options: [
        { value: "a", label: "a" },
        { value: "b", label: "b" },
        { value: "c", label: "c" },
        { value: "d", label: "d" },
        { value: "e", label: "e" },
        { value: "none", label: "none" },
      ],
      excludeFromScore: ["none"],
    });
    expect(getQuestionMaxScore(q)).toBe(5);
  });

  it("radio_multi returns the count of non-excluded options", () => {
    const q = makeQuestion("radio_multi", {
      options: [
        { value: "a", label: "a" },
        { value: "b", label: "b" },
        { value: "c", label: "c" },
        { value: "d", label: "d" },
        { value: "e", label: "e" },
        { value: "none", label: "none" },
      ],
      excludeFromScore: ["none"],
    });
    expect(getQuestionMaxScore(q)).toBe(5);
  });

  it("severity_0_3 returns 3", () => {
    expect(getQuestionMaxScore(makeQuestion("severity_0_3"))).toBe(3);
  });

  it("frequency_0_4 returns 4", () => {
    expect(getQuestionMaxScore(makeQuestion("frequency_0_4"))).toBe(4);
  });

  it("bother_0_4 returns 4", () => {
    expect(getQuestionMaxScore(makeQuestion("bother_0_4"))).toBe(4);
  });

  it("control_0_3 returns the max of its option scores", () => {
    const q = makeQuestion("control_0_3", {
      options: [
        { value: "completely", label: "Completely", score: 0 },
        { value: "well", label: "Well", score: 0 },
        { value: "somewhat", label: "Somewhat", score: 1 },
        { value: "poorly", label: "Poorly", score: 2 },
        { value: "not_at_all", label: "Not at all", score: 3 },
      ],
    });
    expect(getQuestionMaxScore(q)).toBe(3);
  });

  it("yesno, text_input, radio_single, text_input_short, and file_multi all return 0", () => {
    expect(getQuestionMaxScore(makeQuestion("yesno"))).toBe(0);
    expect(getQuestionMaxScore(makeQuestion("text_input"))).toBe(0);
    expect(getQuestionMaxScore(makeQuestion("radio_single"))).toBe(0);
    expect(getQuestionMaxScore(makeQuestion("text_input_short"))).toBe(0);
    expect(getQuestionMaxScore(makeQuestion("file_multi"))).toBe(0);
  });

  it("checkbox_multi with options omitted returns 0 rather than throwing", () => {
    expect(getQuestionMaxScore(makeQuestion("checkbox_multi"))).toBe(0);
  });

  // scoreWeight is declared on QuizQuestion (types.ts:36) but has exactly one reference in the
  // repo — its own declaration. scoreQuestion never reads it, so weighting it into the ceiling
  // would make the derived max unreachable by any real answer (05-RESEARCH.md Pitfall 2).
  it("scoreWeight is ignored by getQuestionMaxScore", () => {
    const q = makeQuestion("severity_0_3", { scoreWeight: 5 });
    expect(getQuestionMaxScore(q)).toBe(3);
  });
});
