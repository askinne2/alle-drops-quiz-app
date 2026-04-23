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
  score_bracket: "3-6",
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
});
