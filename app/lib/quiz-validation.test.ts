import { describe, it, expect } from "vitest";
import { validateQuizData } from "./quiz-validation";

const base = {
  state: "tennessee",
  name: "Test User",
  dob: "1990-01-15",
  email: "test@example.com",
  phone: "6155551212",
  symptom_profile_id: "sp_test_1",
  quiz_score: 5,
  score_bracket: "3-8",
  answers: {},
};

describe("validateQuizData", () => {
  it("rejects invalid score_bracket", () => {
    const r = validateQuizData({ ...base, score_bracket: "moderate" });
    expect(r.valid).toBe(false);
    expect(r.error).toContain("score_bracket");
  });

  it("accepts minimal valid TN payload", () => {
    const r = validateQuizData(base);
    expect(r.valid).toBe(true);
  });

  it("accepts score_bracket 3-8", () => {
    const r = validateQuizData({ ...base, score_bracket: "3-8" });
    expect(r.valid).toBe(true);
  });

  it("accepts score_bracket 9+", () => {
    const r = validateQuizData({ ...base, score_bracket: "9+" });
    expect(r.valid).toBe(true);
  });

  it("rejects retired score_bracket 7+", () => {
    const r = validateQuizData({ ...base, score_bracket: "7+" });
    expect(r.valid).toBe(false);
  });

  it("rejects retired score_bracket 3-6", () => {
    const r = validateQuizData({ ...base, score_bracket: "3-6" });
    expect(r.valid).toBe(false);
  });

  it("does not echo a garbage score_bracket value back in the error message", () => {
    const garbage = "totally-not-a-bracket-xyz123";
    const r = validateQuizData({ ...base, score_bracket: garbage });
    expect(r.valid).toBe(false);
    expect(r.error).not.toContain(garbage);
  });
});
