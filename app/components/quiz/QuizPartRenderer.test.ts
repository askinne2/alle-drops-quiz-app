import { describe, it, expect } from "vitest";
import { isPartComplete } from "./QuizPartRenderer";
import { PART1_SYMPTOM_CHECKLIST, PART5_TREATMENT } from "../../lib/quiz/questions";
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

describe("med_list — label copy is separate from required-ness (DEF-04 / D-13)", () => {
  const medList = PART5_TREATMENT.find((q) => q.id === "med_list")!;

  it("asks the question without annotating it as mandatory", () => {
    expect(medList.text).toBe("Please list your current allergy medications and dosages");
  });

  // Built from fragments rather than written out, because the annotation this asserts the
  // absence of is also asserted absent from the served bundle. A literal here would be
  // harmless, but the habit of not reproducing a forbidden token is the point.
  const ANNOTATION = `(${"required"})`;

  it("carries no mandatory annotation in the label", () => {
    expect(medList.text).not.toContain(ANNOTATION);
    expect(medList.text).toBe(medList.text.trim());
    expect(medList.text.endsWith(":")).toBe(false);
  });

  it("still blocks advance when the medication list is empty", () => {
    expect(isPartComplete(PART5_TREATMENT, { taking_meds: "yes", med_list: "" })).toBe(false);
  });

  it("still blocks advance when the medication list is only whitespace", () => {
    expect(isPartComplete(PART5_TREATMENT, { taking_meds: "yes", med_list: "   " })).toBe(false);
  });

  it("does not block an otherwise complete part when the list is filled in", () => {
    const answers = {
      taking_meds: "yes",
      med_list: "Cetirizine 10mg daily",
      med_control: "well",
    };
    expect(isPartComplete(PART5_TREATMENT, answers)).toBe(true);
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
