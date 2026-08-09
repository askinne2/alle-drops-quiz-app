import { describe, it, expect } from "vitest";
import { isPartComplete } from "./QuizPartRenderer";
import { PART1_SYMPTOM_CHECKLIST, PART5_TREATMENT } from "../../lib/quiz/questions";
import { scoreQuestion } from "../../lib/quiz/scoring";
import { PART6_MEDICAL_HISTORY } from "../../lib/quiz/questions";
import type { QuizItem } from "../../lib/quiz/types";

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

describe("isPartComplete — an empty array no longer counts as answered (D-06)", () => {
  // Deliberate, patient-visible change signed off in D-06: a patient could previously tick a
  // symptom box, untick it, and advance with nothing recorded, and the submission could not
  // distinguish "no symptoms" from "did not engage" even though every one of these three
  // questions offers an explicit "None of the above". The change is scoped to `[]` only — the
  // none-of-the-above path (below) stays green, unchanged from the existing test above.
  it("is incomplete when one question's answer is an empty array", () => {
    const answers = {
      symptoms_nasal: [],
      symptoms_eye: ["none"],
      symptoms_sinus: ["none"],
    };
    expect(isPartComplete(PART1_SYMPTOM_CHECKLIST, answers)).toBe(false);
  });

  it("is still complete when every question answers 'none' (scoped to [], not to none-of-the-above)", () => {
    const answers = {
      symptoms_nasal: ["none"],
      symptoms_eye: ["none"],
      symptoms_sinus: ["none"],
    };
    expect(isPartComplete(PART1_SYMPTOM_CHECKLIST, answers)).toBe(true);
  });
});

describe("isPartComplete — Part 6 does not become un-completable (D-05 / D-06 interaction)", () => {
  // This contradicts a supporting claim in D-06 and is deliberately preserved here so a future
  // reader does not "fix" it away. D-06's rationale claimed all seven checklist questions carry
  // an explicit "None of the above" — that is FALSE for history_personal and history_family
  // (questions.ts:222-249 per 02-CONTEXT.md's D-06 correction). QuizContainer's effect seeds
  // both to [] on entering the medical-history step, so under a naive default-required reading a
  // patient with no personal or family history could never advance. `required: false` on both
  // (added in Plan 02-01) reproduces today's behavior exactly; Phase 3 replaces this part
  // wholesale.
  it("is complete when both history questions are seeded to an empty array", () => {
    const answers = {
      history_personal: [],
      history_family: [],
    };
    expect(isPartComplete(PART6_MEDICAL_HISTORY, answers)).toBe(true);
  });
});

describe("isPartComplete — showIf replaces the med_list / med_control special case", () => {
  // Pins the SCH-02 substitution behaviorally, not only as a source-text literal count.
  it("is complete when taking_meds is 'no' — both conditional questions are hidden, so neither is required", () => {
    expect(isPartComplete(PART5_TREATMENT, { taking_meds: "no" })).toBe(true);
  });

  it("is incomplete when taking_meds is 'yes' — both conditional questions are now visible and unanswered", () => {
    expect(isPartComplete(PART5_TREATMENT, { taking_meds: "yes" })).toBe(false);
  });
});

describe("isPartComplete — info block (D-11 / D-12)", () => {
  const realQuestion = PART1_SYMPTOM_CHECKLIST.find((q) => q.id === "symptoms_nasal")!;

  const infoBlock: QuizItem = {
    kind: "info",
    id: "info_test_block",
    heading: "Test heading",
    paragraphs: ["Test paragraph."],
    order: 999,
    part: 1,
  };

  const hiddenInfoBlock: QuizItem = {
    ...infoBlock,
    id: "info_test_block_hidden",
    showIf: { questionId: "taking_meds", equals: "yes" },
  };

  it("is complete when only the real question is answered — the info block never demands one", () => {
    const items: QuizItem[] = [infoBlock, realQuestion];
    expect(isPartComplete(items, { symptoms_nasal: ["none"] })).toBe(true);
  });

  it("is complete when the part consists of an info block alone", () => {
    expect(isPartComplete([infoBlock], {})).toBe(true);
  });

  it("is complete when an info block's showIf is unsatisfied — a hidden info block does not block completion either", () => {
    const items: QuizItem[] = [hiddenInfoBlock, realQuestion];
    expect(isPartComplete(items, { symptoms_nasal: ["none"], taking_meds: "no" })).toBe(true);
  });

  it("does not require an answers key for the info block's id, and a fabricated one does not change the result", () => {
    const items: QuizItem[] = [infoBlock, realQuestion];
    const withoutInfoAnswer = isPartComplete(items, { symptoms_nasal: ["none"] });
    const withFabricatedInfoAnswer = isPartComplete(items, {
      symptoms_nasal: ["none"],
      info_test_block: ["something"],
    });
    expect(withoutInfoAnswer).toBe(true);
    expect(withFabricatedInfoAnswer).toBe(true);
    expect(withoutInfoAnswer).toBe(withFabricatedInfoAnswer);
  });
});
