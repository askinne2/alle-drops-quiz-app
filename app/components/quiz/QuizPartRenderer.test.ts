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
      // diagnosed_allergic_condition (DIAG-01) joined PART5_TREATMENT in Phase 3 and is required
      // by default (Phase 2 D-05) — an answer is now needed for this part to read as complete.
      diagnosed_allergic_condition: "yes",
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

describe("isPartComplete — Part 6 (HIST-01..HIST-04) required-ness (Phase 3, 03-01)", () => {
  it("is incomplete with no answers at all — HIST-01 blocks (a required checkbox with no entry is not answered)", () => {
    expect(isPartComplete(PART6_MEDICAL_HISTORY, {})).toBe(false);
  });

  it("is incomplete when history_comorbidities is an empty array — [] does not satisfy a required checkbox question (D-06)", () => {
    expect(isPartComplete(PART6_MEDICAL_HISTORY, { history_comorbidities: [] })).toBe(false);
  });

  it("is incomplete when only 'none' is selected — current_medications is now revealed (isAnswered) and required, and the rest of the part is unanswered", () => {
    expect(isPartComplete(PART6_MEDICAL_HISTORY, { history_comorbidities: ["none"] })).toBe(false);
  });

  it("is complete for a fully-answered 'healthy patient' with no history — the reachability proof HIST-01's 'none' option exists for", () => {
    const answers = {
      history_comorbidities: ["none"],
      current_medications: "None",
      history_surgeries_has: "no",
      history_allergies_has: "no",
      history_conditions_has: "no",
      has_pcp: "no",
    };
    expect(isPartComplete(PART6_MEDICAL_HISTORY, answers)).toBe(true);
  });

  it("is incomplete when has_pcp is 'yes' with no clinic fields filled in, and complete once both are filled in", () => {
    const base = {
      history_comorbidities: ["none"],
      current_medications: "None",
      history_surgeries_has: "no",
      history_allergies_has: "no",
      history_conditions_has: "no",
      has_pcp: "yes",
    };
    expect(isPartComplete(PART6_MEDICAL_HISTORY, base)).toBe(false);

    const withClinicFields = {
      ...base,
      pcp_clinic_name: "Greenville Family Medicine",
      pcp_clinic_address: "123 Main St, Greenville, SC",
    };
    expect(isPartComplete(PART6_MEDICAL_HISTORY, withClinicFields)).toBe(true);
  });

  it("is incomplete when current_medications is whitespace-only — isAnswered's trim rule", () => {
    const answers = {
      history_comorbidities: ["none"],
      current_medications: "   ",
      history_surgeries_has: "no",
      history_allergies_has: "no",
      history_conditions_has: "no",
      has_pcp: "no",
    };
    expect(isPartComplete(PART6_MEDICAL_HISTORY, answers)).toBe(false);
  });
});

describe("isPartComplete — showIf replaces the med_list / med_control special case", () => {
  // Pins the SCH-02 substitution behaviorally, not only as a source-text literal count.
  // diagnosed_allergic_condition (DIAG-01) joined PART5_TREATMENT in Phase 3 and is required by
  // default (Phase 2 D-05) — both fixtures below now include an answer for it so these
  // assertions stay scoped to the taking_meds/med_list/med_control interaction they test.
  it("is complete when taking_meds is 'no' — both conditional questions are hidden, so neither is required", () => {
    expect(
      isPartComplete(PART5_TREATMENT, { taking_meds: "no", diagnosed_allergic_condition: "no" })
    ).toBe(true);
  });

  it("is incomplete when taking_meds is 'yes' — both conditional questions are now visible and unanswered", () => {
    expect(
      isPartComplete(PART5_TREATMENT, { taking_meds: "yes", diagnosed_allergic_condition: "yes" })
    ).toBe(false);
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
