import { describe, it, expect } from "vitest";
import {
  isQuestion,
  selectedValues,
  isAnswered,
  evaluateShowIf,
  visibleItems,
  visibleAnswers,
  toggleOption,
  isOptionDisabledByExclusive,
  itemsForPart,
} from "./schema";
import {
  PART1_SYMPTOM_CHECKLIST,
  PART2_TIMING_TRIGGERS,
  PART3_SEVERITY,
  PART4_IMPACT,
  PART5_TREATMENT,
  ALL_SCORED_QUESTIONS,
  ALL_ITEMS,
} from "./questions";
// Separate import statements (rather than folding into the blocks above) so Task 3's diff is
// additions-only against the Task 1 commit, per this task's acceptance criteria.
import { getQuestionById } from "./questions";
import type { QuizAnswers, QuizInfoBlock, QuizQuestion, ShowIfCondition } from "./types";
import type { QuizItem } from "./types";

/**
 * Behavior spec for the pure evaluator module every question-ID literal in the renderer is
 * being replaced by (see 02-02-PLAN.md). Structure follows navigation.test.ts's convention:
 * named fixture tables at the top with a why-comment per row, describe blocks named after the
 * exported function, table-driven loops, and explicit null/undefined/number/object narrowing
 * as individual `it`s.
 *
 * This file is written and run BEFORE app/lib/quiz/schema.ts exists (TDD RED — Task 1). Do not
 * create schema.ts alongside this file.
 */

// Real question fixtures pulled from the live data. Test-local fixtures are built only where
// the real data cannot express the case (info blocks, the D-15 alternate-spelling row, and the
// dangling reference).
const SYMPTOMS_NASAL = PART1_SYMPTOM_CHECKLIST.find((q) => q.id === "symptoms_nasal")!;
const TIMING_TRIGGERS = PART2_TIMING_TRIGGERS.find((q) => q.id === "timing_triggers")!;
const TIMING_SEASON = PART2_TIMING_TRIGGERS.find((q) => q.id === "timing_season")!;
const SEVERITY_NASAL_CONGESTION = PART3_SEVERITY.find((q) => q.id === "severity_nasal_congestion")!;
const IMPACT_SLEEP = PART4_IMPACT.find((q) => q.id === "impact_sleep")!;
const BOTHER_OVERALL = PART4_IMPACT.find((q) => q.id === "bother_overall")!;
const TAKING_MEDS = PART5_TREATMENT.find((q) => q.id === "taking_meds")!;
const MED_LIST = PART5_TREATMENT.find((q) => q.id === "med_list")!;
const MED_CONTROL = PART5_TREATMENT.find((q) => q.id === "med_control")!;

// ─────────────────────────────────────────────
// isQuestion
// ─────────────────────────────────────────────

describe("isQuestion", () => {
  it("returns true for a real QuizQuestion", () => {
    expect(isQuestion(SYMPTOMS_NASAL)).toBe(true);
  });

  it("returns false for a QuizInfoBlock", () => {
    const info: QuizInfoBlock = {
      kind: "info",
      id: "info_isQuestion_test",
      paragraphs: ["n/a"],
      order: 1,
      part: 1,
    };
    expect(isQuestion(info)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// selectedValues
// ─────────────────────────────────────────────

describe("selectedValues", () => {
  it("returns the array unchanged when the value is already an array", () => {
    expect(selectedValues(["sneezing", "runny_nose"])).toEqual(["sneezing", "runny_nose"]);
  });

  it("returns [] for undefined", () => {
    expect(selectedValues(undefined)).toEqual([]);
  });

  it("returns [] for a bare string", () => {
    expect(selectedValues("sneezing")).toEqual([]);
  });

  it("returns [] for a number", () => {
    expect(selectedValues(2)).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// isAnswered (D-06, D-07, D-08)
// ─────────────────────────────────────────────
// Table-driven against the REAL question constants, matching navigation.test.ts's
// accept/reject-table convention. Each row states which decision it pins.

interface IsAnsweredCase {
  question: QuizQuestion;
  value: string | string[] | number | undefined;
  expected: boolean;
  why: string;
}

const IS_ANSWERED_CASES: IsAnsweredCase[] = [
  // checkbox_multi / radio_multi
  {
    question: SYMPTOMS_NASAL,
    value: ["sneezing"],
    expected: true,
    why: "a real selection answers a checkbox question",
  },
  {
    question: SYMPTOMS_NASAL,
    value: [],
    expected: false,
    why: "D-06 — an empty array does not count as answered, deliberate behavior change",
  },
  {
    question: SYMPTOMS_NASAL,
    value: undefined,
    expected: false,
    why: "no value at all is unanswered",
  },
  {
    question: SYMPTOMS_NASAL,
    value: "sneezing",
    expected: false,
    why: "a bare string is not a valid multi-select answer",
  },
  {
    question: SYMPTOMS_NASAL,
    value: 1,
    expected: false,
    why: "a number is not a valid multi-select answer",
  },
  {
    question: TIMING_TRIGGERS,
    value: ["pets"],
    expected: true,
    why: "radio_multi uses the same array rule as checkbox_multi",
  },
  {
    question: TIMING_TRIGGERS,
    value: [],
    expected: false,
    why: "D-06 — the empty array rule applies identically to radio_multi",
  },
  // text_input
  {
    question: MED_LIST,
    value: "Cetirizine 10mg",
    expected: true,
    why: "non-blank text answers a text_input question",
  },
  {
    question: MED_LIST,
    value: "",
    expected: false,
    why: "an empty string is not answered",
  },
  {
    question: MED_LIST,
    value: "   ",
    expected: false,
    why: "D-08 — whitespace-only stays blocked, matching the two existing med_list tests",
  },
  {
    question: MED_LIST,
    value: undefined,
    expected: false,
    why: "no value at all is unanswered",
  },
  // numeric scales (severity_0_3 / frequency_0_4 / bother_0_4 share one switch case)
  {
    question: SEVERITY_NASAL_CONGESTION,
    value: 0,
    expected: true,
    why: "zero is a meaningful answer — 'None' severity is still an answer",
  },
  {
    question: SEVERITY_NASAL_CONGESTION,
    value: 3,
    expected: true,
    why: "a non-zero severity answers the question",
  },
  {
    question: SEVERITY_NASAL_CONGESTION,
    value: "0",
    expected: false,
    why: "a string '0' is not the number 0",
  },
  {
    question: SEVERITY_NASAL_CONGESTION,
    value: undefined,
    expected: false,
    why: "no value at all is unanswered",
  },
  {
    question: IMPACT_SLEEP,
    value: 0,
    expected: true,
    why: "frequency_0_4 shares the numeric-scale rule; zero ('Not at all') is still an answer",
  },
  {
    question: BOTHER_OVERALL,
    value: 0,
    expected: true,
    why: "bother_0_4 shares the numeric-scale rule; zero ('Not bothersome') is still an answer",
  },
  // yesno
  {
    question: TAKING_MEDS,
    value: "yes",
    expected: true,
    why: "'yes' answers a yesno question",
  },
  {
    question: TAKING_MEDS,
    value: "no",
    expected: true,
    why: "'no' answers a yesno question",
  },
  {
    question: TAKING_MEDS,
    value: "maybe",
    expected: false,
    why: "only the exact strings 'yes'/'no' count",
  },
  {
    question: TAKING_MEDS,
    value: "",
    expected: false,
    why: "an empty string is not answered",
  },
  {
    question: TAKING_MEDS,
    value: undefined,
    expected: false,
    why: "no value at all is unanswered",
  },
  // control_0_3
  {
    question: MED_CONTROL,
    value: "well",
    expected: true,
    why: "a non-empty control_0_3 value answers the question",
  },
  {
    question: MED_CONTROL,
    value: "",
    expected: false,
    why: "an empty string is not answered",
  },
  {
    question: MED_CONTROL,
    value: undefined,
    expected: false,
    why: "no value at all is unanswered",
  },
];

describe("isAnswered", () => {
  for (const c of IS_ANSWERED_CASES) {
    it(`${c.question.id} (${c.question.type}) with ${JSON.stringify(c.value)} -> ${c.expected} (${c.why})`, () => {
      expect(isAnswered(c.question, c.value)).toBe(c.expected);
    });
  }
});

// ─────────────────────────────────────────────
// evaluateShowIf (D-01, D-02, D-04)
// ─────────────────────────────────────────────

describe("evaluateShowIf", () => {
  it("returns true when the condition is undefined — no condition means always visible", () => {
    expect(evaluateShowIf(undefined, {})).toBe(true);
  });

  describe("equals", () => {
    it("returns true when the answer matches exactly", () => {
      expect(evaluateShowIf({ questionId: "taking_meds", equals: "yes" }, { taking_meds: "yes" })).toBe(true);
    });

    it("returns false when the answer does not match", () => {
      expect(evaluateShowIf({ questionId: "taking_meds", equals: "yes" }, { taking_meds: "no" })).toBe(false);
    });

    it("returns false when the target answer is missing entirely", () => {
      expect(evaluateShowIf({ questionId: "taking_meds", equals: "yes" }, {})).toBe(false);
    });
  });

  describe("includes", () => {
    it("returns true when the array answer contains the value", () => {
      expect(
        evaluateShowIf({ questionId: "timing_triggers", includes: "pets" }, { timing_triggers: ["pets", "dust"] })
      ).toBe(true);
    });

    it("returns false when the array answer does not contain the value", () => {
      expect(
        evaluateShowIf({ questionId: "timing_triggers", includes: "pets" }, { timing_triggers: ["dust"] })
      ).toBe(false);
    });

    it("returns false when the answer is not an array", () => {
      expect(
        evaluateShowIf({ questionId: "timing_triggers", includes: "pets" }, { timing_triggers: "pets" })
      ).toBe(false);
    });

    it("returns false when the target answer is missing entirely", () => {
      expect(evaluateShowIf({ questionId: "timing_triggers", includes: "pets" }, {})).toBe(false);
    });
  });

  describe("isAnswered", () => {
    // D-07: the required check and the reveal trigger fire under identical conditions. Proven
    // by delegating to the exact same predicate the required check uses, on a checkbox
    // question, using the D-06 empty-array case as the negative side of the delegation.
    it("returns false when the resolved target's answer is an empty array — delegates to the real isAnswered (D-07)", () => {
      expect(evaluateShowIf({ questionId: "symptoms_nasal", isAnswered: true }, { symptoms_nasal: [] })).toBe(false);
    });

    it("returns true when the resolved target's answer is non-empty — delegates to the real isAnswered (D-07)", () => {
      expect(
        evaluateShowIf({ questionId: "symptoms_nasal", isAnswered: true }, { symptoms_nasal: ["sneezing"] })
      ).toBe(true);
    });
  });

  describe("fails open", () => {
    // D-04: an unresolved questionId must render the item, never hide it. Hiding would silently
    // skip a clinical question AND silently skip its required check. This is the inverse of
    // Phase 1's navigation fail-closed rule and must not be "corrected" back to fail-closed.
    it("returns true for a condition whose questionId does not resolve to any real question", () => {
      const dangling: ShowIfCondition = { questionId: "does_not_exist_anywhere", equals: "yes" };
      expect(evaluateShowIf(dangling, { does_not_exist_anywhere: "no" })).toBe(true);
    });

    it("fails open regardless of which operator the dangling condition carries", () => {
      const danglingIncludes: ShowIfCondition = { questionId: "does_not_exist_anywhere", includes: "x" };
      const danglingIsAnswered: ShowIfCondition = { questionId: "does_not_exist_anywhere", isAnswered: true };
      expect(evaluateShowIf(danglingIncludes, {})).toBe(true);
      expect(evaluateShowIf(danglingIsAnswered, {})).toBe(true);
    });
  });

  describe("never throws", () => {
    it("returns a boolean rather than raising for null in place of a condition", () => {
      expect(() => evaluateShowIf(null as unknown as ShowIfCondition, {})).not.toThrow();
      expect(typeof evaluateShowIf(null as unknown as ShowIfCondition, {})).toBe("boolean");
    });

    it("returns a boolean rather than raising when answers itself is undefined", () => {
      expect(() =>
        evaluateShowIf({ questionId: "taking_meds", equals: "yes" }, undefined as unknown as QuizAnswers)
      ).not.toThrow();
      expect(
        evaluateShowIf({ questionId: "taking_meds", equals: "yes" }, undefined as unknown as QuizAnswers)
      ).toBe(false);
    });

    it("returns a boolean rather than raising for a number in place of a condition", () => {
      expect(() => evaluateShowIf(42 as unknown as ShowIfCondition, {})).not.toThrow();
      expect(typeof evaluateShowIf(42 as unknown as ShowIfCondition, {})).toBe("boolean");
    });

    it("returns a boolean rather than raising for a plain object in place of a condition", () => {
      expect(() => evaluateShowIf({} as unknown as ShowIfCondition, {})).not.toThrow();
      expect(typeof evaluateShowIf({} as unknown as ShowIfCondition, {})).toBe("boolean");
    });
  });
});

// ─────────────────────────────────────────────
// visibleItems (D-12)
// ─────────────────────────────────────────────

describe("visibleItems", () => {
  it("always returns an item with no showIf", () => {
    expect(visibleItems([SEVERITY_NASAL_CONGESTION], {})).toEqual([SEVERITY_NASAL_CONGESTION]);
  });

  it("omits a question whose showIf is unsatisfied", () => {
    expect(visibleItems([MED_LIST], { taking_meds: "no" })).toEqual([]);
  });

  it("includes a question whose showIf is satisfied", () => {
    expect(visibleItems([MED_LIST], { taking_meds: "yes" })).toEqual([MED_LIST]);
  });

  it("omits an info block whose showIf is unsatisfied — info blocks compose with showIf, they are not decoration (D-12)", () => {
    const info: QuizInfoBlock = {
      kind: "info",
      id: "info_visibleItems_conditional",
      paragraphs: ["Shown only when taking meds."],
      order: 1,
      part: 5,
      showIf: { questionId: "taking_meds", equals: "yes" },
    };
    expect(visibleItems([info], { taking_meds: "no" })).toEqual([]);
  });

  it("includes an info block whose showIf is satisfied", () => {
    const info: QuizInfoBlock = {
      kind: "info",
      id: "info_visibleItems_conditional_shown",
      paragraphs: ["Shown only when taking meds."],
      order: 1,
      part: 5,
      showIf: { questionId: "taking_meds", equals: "yes" },
    };
    expect(visibleItems([info], { taking_meds: "yes" })).toEqual([info]);
  });

  it("preserves order and does not mutate the input array", () => {
    const input = [SEVERITY_NASAL_CONGESTION, MED_LIST, TAKING_MEDS];
    const snapshot = [...input];
    const result = visibleItems(input, { taking_meds: "no" });
    expect(result).toEqual([SEVERITY_NASAL_CONGESTION, TAKING_MEDS]);
    expect(input).toEqual(snapshot);
  });
});

// ─────────────────────────────────────────────
// itemsForPart (UAT defect fix — info blocks never reached the renderer)
// ─────────────────────────────────────────────
// UAT found that QuizContainer.tsx filtered QUIZ_PARTS[currentPartIndex] down to
// `item.kind === "question"` before handing the result to QuizPartRenderer, which silently
// discarded every info block. QuizPartRenderer and isPartComplete both already accept the full
// QuizItem[] union correctly (isPartComplete's own `isQuestion` narrow already skips info blocks
// for the required check without needing them pre-filtered out of the list). itemsForPart is the
// pure selector QuizContainer now calls instead of filtering inline.

describe("itemsForPart", () => {
  it("returns the full item array for a valid index, unfiltered", () => {
    expect(itemsForPart([PART1_SYMPTOM_CHECKLIST], 0)).toEqual(PART1_SYMPTOM_CHECKLIST);
  });

  it("returns [] for an index past the end of the array", () => {
    expect(itemsForPart([PART1_SYMPTOM_CHECKLIST], 5)).toEqual([]);
  });

  it("returns [] for a negative index", () => {
    expect(itemsForPart([PART1_SYMPTOM_CHECKLIST], -1)).toEqual([]);
  });

  // This is the actual regression proof: an info block placed inside a part MUST survive the
  // selection step. A `item.kind === "question"` filter (the bug UAT found) would strip it and
  // this assertion would fail — that is the failure this test exists to catch.
  it("keeps a QuizInfoBlock placed inside a part — the info block must survive selection, not just visibility filtering", () => {
    const info: QuizInfoBlock = {
      kind: "info",
      id: "info_itemsForPart_survives",
      paragraphs: ["Informational content with no answer to collect."],
      order: 5,
      part: 1,
    };
    const partWithInfoBlock: QuizItem[] = [SYMPTOMS_NASAL, info, TAKING_MEDS];
    const result = itemsForPart([partWithInfoBlock], 0);
    expect(result).toEqual([SYMPTOMS_NASAL, info, TAKING_MEDS]);
    expect(result.some((item) => item.kind === "info")).toBe(true);
  });

  it("does not mutate the source parts array", () => {
    const info: QuizInfoBlock = {
      kind: "info",
      id: "info_itemsForPart_no_mutate",
      paragraphs: ["n/a"],
      order: 1,
      part: 1,
    };
    const parts: QuizItem[][] = [[SYMPTOMS_NASAL, info]];
    const snapshot = JSON.parse(JSON.stringify(parts));
    itemsForPart(parts, 0);
    expect(parts).toEqual(snapshot);
  });
});

// ─────────────────────────────────────────────
// visibleAnswers (D-03, DIR-02) — the highest-stakes group in this file
// ─────────────────────────────────────────────

describe("visibleAnswers", () => {
  it("strips a hidden question's answer from the RESULT", () => {
    const answers: QuizAnswers = { taking_meds: "no", med_list: "Cetirizine 10mg" };
    const result = visibleAnswers(PART5_TREATMENT, answers);
    expect(result.med_list).toBeUndefined();
  });

  it("does not mutate the SOURCE answers object — a patient who toggles a parent answer back and forth does not lose typed text (D-03)", () => {
    const answers: QuizAnswers = { taking_meds: "no", med_list: "Cetirizine 10mg" };
    visibleAnswers(PART5_TREATMENT, answers);
    expect(answers.med_list).toBe("Cetirizine 10mg");
  });

  it("keeps a visible question's answer", () => {
    const answers: QuizAnswers = { taking_meds: "yes", med_list: "Cetirizine 10mg" };
    const result = visibleAnswers(PART5_TREATMENT, answers);
    expect(result.med_list).toBe("Cetirizine 10mg");
    expect(result.taking_meds).toBe("yes");
  });

  it("keeps history_personal and history_family when the real ALL_ITEMS is passed", () => {
    const answers: QuizAnswers = {
      history_personal: ["asthma"],
      history_family: ["rhinitis"],
    };
    const result = visibleAnswers(ALL_ITEMS, answers);
    expect(result.history_personal).toEqual(["asthma"]);
    expect(result.history_family).toEqual(["rhinitis"]);
  });

  // DIR-02 — the highest-stakes assertion in this file. A keep-known-and-visible whitelist
  // passes the ALL_ITEMS row above and FAILS this one, which is precisely why this row exists:
  // the failure being guarded is a clinical record silently losing history_personal with no
  // error and no failing test, the moment a caller hands visibleAnswers an item list that
  // happens not to include Part 6.
  it("passes an unknown key through untouched even when the item list omits Part 6", () => {
    const answers: QuizAnswers = {
      taking_meds: "no",
      med_list: "X",
      history_personal: ["asthma"],
    };
    const result = visibleAnswers(ALL_SCORED_QUESTIONS, answers);
    expect(result.history_personal).toEqual(["asthma"]);
    expect(result.med_list).toBeUndefined();
  });

  it("passes a key belonging to no known item through untouched — strip only KNOWN and HIDDEN, never unknown", () => {
    const answers: QuizAnswers = {
      taking_meds: "yes",
      future_phase_field: "some Phase 3/4 value",
    };
    const result = visibleAnswers(ALL_ITEMS, answers);
    expect(result.future_phase_field).toBe("some Phase 3/4 value");
  });

  it("never lets an info block's id appear in the result, even if an answers entry is fabricated for it (D-11)", () => {
    const info: QuizInfoBlock = {
      kind: "info",
      id: "info_visibleAnswers_fabricated",
      paragraphs: ["n/a"],
      order: 1,
      part: 1,
    };
    const answers: QuizAnswers = { info_visibleAnswers_fabricated: "should never be here" };
    const result = visibleAnswers([info], answers);
    expect(result.info_visibleAnswers_fabricated).toBeUndefined();
  });

  it("strips an orphan medication list end to end — the exact bug D-03 fixes, where a contradicted medication list currently reaches the record Dr. Sullivan reads", () => {
    const answers: QuizAnswers = { taking_meds: "no", med_list: "Cetirizine 10mg" };
    const result = visibleAnswers(ALL_ITEMS, answers);
    expect(result.med_list).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// toggleOption (D-13, D-15, D-16)
// ─────────────────────────────────────────────

describe("toggleOption", () => {
  it("appends a non-exclusive option that is not currently selected", () => {
    expect(toggleOption(SYMPTOMS_NASAL, ["sneezing"], "runny_nose")).toEqual(["sneezing", "runny_nose"]);
  });

  it("removes a non-exclusive option that is currently selected", () => {
    expect(toggleOption(SYMPTOMS_NASAL, ["sneezing", "runny_nose"], "sneezing")).toEqual(["runny_nose"]);
  });

  it("drops the exclusive value and keeps the new value when selecting a non-exclusive option while an exclusive one is selected", () => {
    expect(toggleOption(SYMPTOMS_NASAL, ["none"], "sneezing")).toEqual(["sneezing"]);
  });

  it("selecting an unselected exclusive option clears everything else, resulting in exactly [that value]", () => {
    expect(toggleOption(SYMPTOMS_NASAL, ["sneezing", "runny_nose"], "none")).toEqual(["none"]);
  });

  it("clicking an already-selected exclusive option deselects to [] (D-16), and that [] is correctly unanswered", () => {
    const result = toggleOption(SYMPTOMS_NASAL, ["none"], "none");
    expect(result).toEqual([]);
    // The whole of D-06 + D-16 as a patient experiences it: the same [] that toggleOption
    // produces must make isAnswered return false, so Next correctly disables.
    expect(isAnswered(SYMPTOMS_NASAL, result)).toBe(false);
  });

  it("D-15 — exclusivity works regardless of how the option value is spelled, not just 'none'", () => {
    const altSpellingQuestion: QuizQuestion = {
      kind: "question",
      id: "alt_spelling_test",
      type: "checkbox_multi",
      part: 1,
      text: "Test question for the D-15 spelling-independence regression guard",
      options: [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
        { value: "none_of_the_above", label: "None of the above", exclusive: true },
      ],
      order: 999,
    };
    // Selecting the alternate-spelled exclusive option clears everything else.
    expect(toggleOption(altSpellingQuestion, ["a", "b"], "none_of_the_above")).toEqual(["none_of_the_above"]);
    // Clicking it again while selected deselects to [] — today's code would silently do
    // nothing for this spelling, since it hardcodes the literal "none".
    expect(toggleOption(altSpellingQuestion, ["none_of_the_above"], "none_of_the_above")).toEqual([]);
  });

  it("behaves as plain multi-select when the question has no exclusive option at all", () => {
    expect(toggleOption(TIMING_SEASON, ["spring"], "summer")).toEqual(["spring", "summer"]);
    expect(toggleOption(TIMING_SEASON, ["spring", "summer"], "spring")).toEqual(["summer"]);
    // Even only_rarely — which IS excluded from score — behaves as ordinary multi-select here,
    // since D-14 keeps exclusivity and excludeFromScore deliberately independent.
    expect(toggleOption(TIMING_SEASON, ["spring"], "only_rarely")).toEqual(["spring", "only_rarely"]);
  });
});

// ─────────────────────────────────────────────
// isOptionDisabledByExclusive (D-13)
// ─────────────────────────────────────────────

describe("isOptionDisabledByExclusive", () => {
  const noneOption = SYMPTOMS_NASAL.options!.find((o) => o.value === "none")!;
  const sneezingOption = SYMPTOMS_NASAL.options!.find((o) => o.value === "sneezing")!;

  it("disables a non-exclusive option when an exclusive value is selected", () => {
    expect(isOptionDisabledByExclusive(SYMPTOMS_NASAL, ["none"], sneezingOption)).toBe(true);
  });

  it("never disables the exclusive option itself, so D-16's deselect stays reachable", () => {
    expect(isOptionDisabledByExclusive(SYMPTOMS_NASAL, ["none"], noneOption)).toBe(false);
  });

  it("disables nothing when nothing is selected", () => {
    expect(isOptionDisabledByExclusive(SYMPTOMS_NASAL, [], sneezingOption)).toBe(false);
    expect(isOptionDisabledByExclusive(SYMPTOMS_NASAL, [], noneOption)).toBe(false);
  });

  it("disables nothing for a question with no exclusive option at all", () => {
    const springOption = TIMING_SEASON.options!.find((o) => o.value === "spring")!;
    const onlyRarelyOption = TIMING_SEASON.options!.find((o) => o.value === "only_rarely")!;
    expect(isOptionDisabledByExclusive(TIMING_SEASON, ["spring"], onlyRarelyOption)).toBe(false);
    expect(isOptionDisabledByExclusive(TIMING_SEASON, ["only_rarely"], springOption)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// reference integrity (D-04) — Task 3
// ─────────────────────────────────────────────
// A dangling showIf.questionId must be caught at test time, not just fail open at runtime.
// This block is the test-time half of D-04's two-halves mitigation (T-2-08).

/** Returns the showIf.questionId of every item whose reference does NOT resolve via
 * getQuestionById. An empty result means every showIf in `items` points at a real question. */
function findDanglingShowIfReferences(items: QuizItem[]): string[] {
  const dangling: string[] = [];
  for (const item of items) {
    if (item.showIf && getQuestionById(item.showIf.questionId) === undefined) {
      dangling.push(item.showIf.questionId);
    }
  }
  return dangling;
}

describe("reference integrity (D-04)", () => {
  it("finds zero dangling showIf references in the real ALL_ITEMS, so a typo cannot ship", () => {
    expect(findDanglingShowIfReferences(ALL_ITEMS)).toEqual([]);
  });

  // Without this row the assertion above is vacuous — it would pass identically against a
  // checker that always returns []. This proves the checker can actually detect the typo class
  // D-04 exists to prevent, using a test-local fixture rather than editing questions.ts.
  it("detects a dangling reference in a deliberately broken fixture", () => {
    const broken: QuizItem[] = [
      {
        kind: "question",
        id: "broken_fixture_question",
        type: "text_input",
        part: 1,
        text: "test fixture for the dangling-reference guard",
        order: 999,
        showIf: { questionId: "does_not_exist", equals: "yes" },
      },
    ];
    expect(findDanglingShowIfReferences(broken)).toEqual(["does_not_exist"]);
  });

  // getQuestionById's search scope is QuizQuestion-only (RESEARCH.md Pitfall 5) — it never
  // returns an info block. With that scoping, "every showIf.questionId resolves" (asserted
  // above) already implies "no showIf.questionId resolves to an info block"; this assertion
  // makes that implication explicit rather than leaving it implicit. A future change widening
  // getQuestionById's search scope to include info blocks would silently break this guarantee,
  // which is exactly why it is pinned here as its own assertion.
  it("resolves no showIf.questionId in ALL_ITEMS to an info block", () => {
    for (const item of ALL_ITEMS) {
      if (!item.showIf) continue;
      const target = getQuestionById(item.showIf.questionId);
      expect(target !== undefined && target.kind === "question").toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// no chained showIf (forward guard) — Task 3
// ─────────────────────────────────────────────
// RESEARCH.md Pitfall 4 / Assumption A3: evaluateShowIf has no transitive-visibility awareness.
// If C's showIf targets B, and B is itself conditionally hidden, C reads B's possibly-stale
// answer and can stay visible after B disappears. This phase resolves that deliberately: the
// rule is NON-TRANSITIVE, and it is safe today only because no chain exists in the locked scope
// — med_list and med_control both depend on taking_meds, which carries no showIf of its own, and
// Phase 3's HIST-02/HIST-04 and Phase 4's TEST-02/TEST-03 all branch off unconditional questions
// through Phase 4. The day this guard goes red, the transitive-visibility rule must be decided
// before the chain ships — that is the point of encoding it now, while it is cheap, instead of
// letting Phase 3 discover the ambiguity under schedule pressure.

/** Returns every item in `items` whose showIf points at a question that itself carries a
 * showIf — a two-link chain. An empty result means the non-transitive rule holds today. */
function findChainedShowIf(items: QuizItem[]): QuizItem[] {
  const chained: QuizItem[] = [];
  for (const item of items) {
    if (!item.showIf) continue;
    const target = getQuestionById(item.showIf.questionId);
    if (target?.showIf) chained.push(item);
  }
  return chained;
}

describe("no chained showIf (forward guard)", () => {
  it("finds zero chained showIf references in the real ALL_ITEMS — non-transitive is safe today", () => {
    expect(findChainedShowIf(ALL_ITEMS)).toEqual([]);
  });

  // Non-vacuous proof, per the same pattern as the reference-integrity block above: a
  // test-local item whose showIf targets med_list — a REAL question that itself carries a
  // showIf (med_list depends on taking_meds) — creating a genuine two-link chain resolvable
  // through the real getQuestionById, without editing questions.ts.
  it("detects a two-link chain built from a test-local item pointing at a real question that itself carries a showIf", () => {
    const chainedItem: QuizItem = {
      kind: "question",
      id: "chain_test_fixture",
      type: "yesno",
      part: 5,
      text: "test fixture for the no-chained-showIf guard",
      order: 999,
      showIf: { questionId: "med_list", isAnswered: true },
    };
    expect(findChainedShowIf([chainedItem])).toEqual([chainedItem]);
  });
});
