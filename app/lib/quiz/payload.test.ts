import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSubmitPayload, RESUME_PARITY_EXCLUDED_FIELDS, type SubmitPayload, type SubmitPayloadInput } from "./payload";
import { calculateTotalScore, getScoreBracket } from "./scoring";
import { ALL_ITEMS, ALL_SCORED_QUESTIONS } from "./questions";
import { visibleAnswers } from "./schema";
import type { QuizAnswers } from "./types";

/**
 * Pins ROADMAP success criterion 5 / D-10 at the unit level: "the score and submitted payload
 * are identical whether an intake was completed in one sitting or resumed — resume changes
 * persistence only, never clinical data." This is layer 1 of the two-layer proof
 * (04.2-RESEARCH.md Finding 3) — a pure-function-level guarantee that `buildSubmitPayload`
 * itself cannot produce divergent payloads from identical clinical input, independent of
 * whatever `QuizContainer` wiring calls it (layer 2, covered elsewhere by
 * `tests/quiz-resume-payload-parity.test.ts`).
 */

// Real question IDs from questions.ts, spanning: a scored checkbox_multi question
// (symptoms_nasal), a scored severity_0_3 question (severity_nasal_congestion), a showIf-gated
// question whose gate is CLOSED in this fixture (med_list — showIf taking_meds equals "yes",
// but taking_meds is "no" below, so visibleAnswers must strip it), and the Part 7
// testing_status / testing_year pair (whose gate is OPEN — testing_status is "had_testing").
const FIXTURE_ANSWERS: QuizAnswers = {
  symptoms_nasal: ["sneezing", "runny_nose"], // checkbox_multi, 2 points
  symptoms_eye: ["none"],
  symptoms_sinus: ["none"],
  timing_season: ["only_rarely"], // excluded from score
  timing_triggers: ["none"],
  severity_nasal_congestion: 3, // severity_0_3, 3 points
  severity_sneezing: 0,
  severity_runny_nose: 0,
  severity_nasal_itching: 0,
  severity_eye_itching: 0,
  impact_sleep: 0,
  impact_daily: 0,
  impact_concentrate: 0,
  impact_social: 0,
  bother_overall: 0,
  taking_meds: "no", // closes the med_list / med_control gate
  med_list: "Loratadine 10mg daily", // present in raw answers, must be stripped as hidden
  diagnosed_allergic_condition: "no",
  testing_status: "had_testing",
  testing_year: "2020",
  testing_location: "Greenville Allergy Clinic",
  testing_allergens: "Ragweed, dust mites",
};

const BASE_INPUT: Omit<SubmitPayloadInput, "startTime" | "symptomProfileId" | "score" | "scoreBracket"> = {
  patientState: "tennessee",
  patientInfo: {
    name: " Jane Doe ",
    dob: "1990-01-15",
    email: " jane@example.com ",
    phone: "6155551234",
  },
  answers: FIXTURE_ANSWERS,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("buildSubmitPayload — D-10 parity across differing time inputs", () => {
  it("payloads built from identical clinical input are equal outside RESUME_PARITY_EXCLUDED_FIELDS", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const a = buildSubmitPayload({
      ...BASE_INPUT,
      score: null,
      scoreBracket: null,
      startTime: Date.now() - 60_000,
      symptomProfileId: "AOD_1000000000000",
    });

    vi.setSystemTime(new Date("2026-01-02T15:30:00.000Z"));
    const b = buildSubmitPayload({
      ...BASE_INPUT,
      score: null,
      scoreBracket: null,
      startTime: Date.now() - 500_000,
      symptomProfileId: "AOD_2000000000000",
    });

    const stripExcluded = (payload: SubmitPayload) => {
      const copy: Record<string, unknown> = { ...payload };
      for (const field of RESUME_PARITY_EXCLUDED_FIELDS) delete copy[field];
      return copy;
    };
    expect(stripExcluded(a)).toEqual(stripExcluded(b));

    // The two clinical values ROADMAP criterion 5 names explicitly, asserted separately from
    // the deep compare above with strict equality.
    expect(a.quiz_score).toBe(b.quiz_score);
    expect(a.score_bracket).toBe(b.score_bracket);
  });

  it("non-vacuity: all three excluded fields actually differed between the two calls", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    const a = buildSubmitPayload({
      ...BASE_INPUT,
      score: null,
      scoreBracket: null,
      startTime: Date.now() - 60_000,
      symptomProfileId: "AOD_1000000000000",
    });

    vi.setSystemTime(new Date("2026-01-02T15:30:00.000Z"));
    const b = buildSubmitPayload({
      ...BASE_INPUT,
      score: null,
      scoreBracket: null,
      startTime: Date.now() - 500_000,
      symptomProfileId: "AOD_2000000000000",
    });

    // Without this, the parity assertion above could pass vacuously because the exclusions
    // were never actually exercised.
    expect(a.completion_time).not.toBe(b.completion_time);
    expect(a.quiz_date).not.toBe(b.quiz_date);
    expect(a.symptom_profile_id).not.toBe(b.symptom_profile_id);
  });
});

describe("buildSubmitPayload — score is recomputed, never trusted", () => {
  it("null score/scoreBracket recompute to the same values calculateTotalScore/getScoreBracket produce", () => {
    const expectedScore = calculateTotalScore(ALL_SCORED_QUESTIONS, visibleAnswers(ALL_ITEMS, FIXTURE_ANSWERS));
    const expectedBracket = getScoreBracket(expectedScore);

    const recomputed = buildSubmitPayload({
      ...BASE_INPUT,
      score: null,
      scoreBracket: null,
      startTime: Date.now(),
      symptomProfileId: "AOD_1000000000000",
    });
    const preset = buildSubmitPayload({
      ...BASE_INPUT,
      score: expectedScore,
      scoreBracket: expectedBracket,
      startTime: Date.now(),
      symptomProfileId: "AOD_1000000000000",
    });

    expect(recomputed.quiz_score).toBe(expectedScore);
    expect(recomputed.score_bracket).toBe(expectedBracket);
    expect(preset.quiz_score).toBe(recomputed.quiz_score);
    expect(preset.score_bracket).toBe(recomputed.score_bracket);
  });

  it("a deliberately wrong pre-set score is passed through unchanged (documented `??` pass-through)", () => {
    // This is intentional: buildSubmitPayload's `score ?? calculateTotalScore(...)` fallback only
    // fires when score is null/undefined. When a caller supplies a non-null value, it is trusted
    // as-is — D-10 safety therefore depends on nothing upstream ever restoring a stale/persisted
    // score into QuizContainer state, which draft-store.ts enforces by never giving QuizDraft a
    // `score` field at all (there is nothing to restore).
    const wrong = buildSubmitPayload({
      ...BASE_INPUT,
      score: 999,
      scoreBracket: "7+",
      startTime: Date.now(),
      symptomProfileId: "AOD_1000000000000",
    });
    expect(wrong.quiz_score).toBe(999);
    expect(wrong.score_bracket).toBe("7+");
  });
});

describe("buildSubmitPayload — hidden-answer filtering (D-03 boundary)", () => {
  it("omits the gated question whose showIf is closed and includes the ones whose gates are open", () => {
    const payload = buildSubmitPayload({
      ...BASE_INPUT,
      score: null,
      scoreBracket: null,
      startTime: Date.now(),
      symptomProfileId: "AOD_1000000000000",
    });

    // taking_meds is "no", so med_list's showIf (taking_meds equals "yes") is closed — its answer
    // must not survive into the submit payload even though it was present in raw FIXTURE_ANSWERS.
    expect(payload.answers).not.toHaveProperty("med_list");

    // testing_status is "had_testing", so the Part 7 had_testing children (whose gate is open)
    // must survive.
    expect(payload.answers).toHaveProperty("testing_year", "2020");
    expect(payload.answers).toHaveProperty("testing_location", "Greenville Allergy Clinic");
    expect(payload.answers).toHaveProperty("testing_allergens", "Ragweed, dust mites");
    expect(payload.answers).toHaveProperty("testing_status", "had_testing");
  });
});

describe("RESUME_PARITY_EXCLUDED_FIELDS — the exclusion list cannot grow (T-4.2-06)", () => {
  it("has exactly three members, in the exact expected order", () => {
    // The guard that stops a future agent from making a failing D-10 parity test pass by
    // widening this list instead of fixing a real divergence.
    expect(RESUME_PARITY_EXCLUDED_FIELDS.length).toBe(3);
    expect([...RESUME_PARITY_EXCLUDED_FIELDS]).toEqual(["completion_time", "quiz_date", "symptom_profile_id"]);
  });
});

describe("buildSubmitPayload — missing patient context throws", () => {
  it("throws when patientState is null", () => {
    expect(() =>
      buildSubmitPayload({
        ...BASE_INPUT,
        patientState: null,
        score: null,
        scoreBracket: null,
        startTime: Date.now(),
        symptomProfileId: "AOD_1000000000000",
      })
    ).toThrow("Missing patient context");
  });

  it("throws when symptomProfileId is null", () => {
    expect(() =>
      buildSubmitPayload({
        ...BASE_INPUT,
        score: null,
        scoreBracket: null,
        startTime: Date.now(),
        symptomProfileId: null,
      })
    ).toThrow("Missing patient context");
  });
});
