import { describe, it, expect } from "vitest";
import { isPartComplete } from "./QuizPartRenderer";
import { PART1_SYMPTOM_CHECKLIST } from "../../lib/quiz/questions";
import { scoreQuestion } from "../../lib/quiz/scoring";

describe("isPartComplete — Part 1 'None of the above'", () => {
  it("is incomplete when a symptom checklist question is unanswered", () => {
    expect(isPartComplete(PART1_SYMPTOM_CHECKLIST, {})).toBe(false);
  });

  it("is complete when every question answers 'none'", () => {
    const answers = {
      symptoms_nasal: ["none"],
      symptoms_eye: ["none"],
      symptoms_sinus: ["none"],
    };
    expect(isPartComplete(PART1_SYMPTOM_CHECKLIST, answers)).toBe(true);
  });
});

describe("scoreQuestion — 'none' is excluded from score", () => {
  it("scores 0 when 'none' is the only selection", () => {
    const question = PART1_SYMPTOM_CHECKLIST.find((q) => q.id === "symptoms_nasal")!;
    expect(scoreQuestion(question, ["none"])).toBe(0);
  });

  it("still scores real symptoms normally", () => {
    const question = PART1_SYMPTOM_CHECKLIST.find((q) => q.id === "symptoms_nasal")!;
    expect(scoreQuestion(question, ["sneezing", "runny_nose"])).toBe(2);
  });
});
