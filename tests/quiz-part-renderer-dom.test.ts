// @vitest-environment jsdom
/**
 * tests/quiz-part-renderer-dom.test.ts
 *
 * FIRST DOM-RENDERING TEST IN THIS REPOSITORY. Renders the REAL `itemsForPart(QUIZ_PARTS, 5)`
 * (Part 6, medical history) through the REAL `QuizPartRenderer` and queries the resulting DOM
 * with `@testing-library/react` + `jsdom` — both added as devDependencies ONLY, per
 * `03-04-PLAN.md`'s `<dom_test_infra_decision>`. Task 1's package-legitimacy checkpoint was
 * presented to Andrew and explicitly approved in-session on 2026-08-09 before this file or the
 * `npm install` that made it possible were written.
 *
 * WHY THIS FILE EXISTS. Three defects have shipped past a fully green suite, all in the exact
 * seam this file renders (`QUIZ_PARTS` -> `itemsForPart` -> `QuizPartRenderer` -> DOM):
 *   - Session 32: `public/quiz-bundle.js` never rebuilt — phase invisible on the storefront.
 *   - Session 32: the container filtered info blocks out before the renderer ever saw them.
 *   - Session 33: an exclusive checkbox option disabled every sibling, making the escape hatch
 *     unreachable.
 * `schema.ts` was correct in all three cases; the bugs lived in the wiring between the pure
 * module and the DOM. This file exercises that wiring directly, closing the blind spot.
 *
 * WHY QuizContainer IS NOT RENDERED HERE. `QuizContainer` reads `window`, posts cross-origin
 * `postMessage` events, and calls `fetch` — rendering it needs its own mock surface, which
 * becomes its own maintenance liability and its own source of false confidence. Its wiring
 * stays guarded by source-text guards with positive controls (see
 * `tests/quiz-medical-history-deletion.test.ts`), which is what actually caught the session-32
 * container defect once it was known.
 *
 * WHAT THIS FILE DOES NOT PROVE. jsdom proves a node exists in a tree; it cannot prove the card
 * paints, that the accent border is visible, or that the card is not hidden under the sticky
 * header on a real mobile viewport. The manual browser check budgeted in plan 03-05 is NOT
 * discharged by this file — see UI-SPEC.md's "Verification budget" note under HIST-04.
 *
 * WHY .ts, NOT .tsx. `vitest.config.ts`'s `include` glob is
 * `["app/**\/*.test.ts", "tests/**\/*.test.ts"]` and does not match `.test.tsx` — widening it is
 * a config change with a wider blast radius than this plan warrants (03-04-PLAN.md's
 * `<interfaces>` section). Elements are constructed with `React.createElement`, not JSX.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { QuizPartRenderer, isPartComplete } from "../app/components/quiz/QuizPartRenderer";
import { itemsForPart } from "../app/lib/quiz/schema";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";
import type { QuizAnswers } from "../app/lib/quiz/types";

afterEach(() => {
  cleanup();
});

// The REAL Part 6 items — reproduces the QUIZ_PARTS -> itemsForPart -> renderer seam that
// failed in session 32, where the container dropped info blocks before the renderer saw them.
const PART_6_ITEMS = itemsForPart(QUIZ_PARTS, 5);

const NO_PCP_SENTENCE =
  "We recommend that you establish with a primary care physician before beginning SLIT.";
const CLINIC_NAME_LABEL = "What is the name of your PCP's clinic?";
const CLINIC_ADDRESS_LABEL = "What is the address of your PCP's clinic?";
const MEDICATIONS_LABEL =
  "What medications (including dosage) are you currently taking (please list all)";

function renderPart6(answers: QuizAnswers, onAnswerChange: (...args: unknown[]) => void = vi.fn()) {
  const utils = render(
    React.createElement(QuizPartRenderer, { items: PART_6_ITEMS, answers, onAnswerChange })
  );
  return { onAnswerChange, ...utils };
}

// The REAL Part 7 items — 04-07's target seam. Part 7 is Phase 4's mandatory allergy-testing
// split: a required radio_single gate (testing_status) plus three showIf-gated required
// text_input_short/text_input children, all declared in questions.ts (04-06), rendered here
// through the real QuizPartRenderer (04-07 Task 1) with no synthetic question array.
const PART_7_ITEMS = itemsForPart(QUIZ_PARTS, 6);

const NEEDS_TESTING_LABEL = "I need allergy testing";
const HAD_TESTING_LABEL = "I've already had allergy testing";
const TESTING_YEAR_LABEL = "What year did you have your allergy testing done?";
const TESTING_LOCATION_LABEL = "Where did you have your allergy testing done?";
const TESTING_ALLERGENS_LABEL = "What Allergens Did You React To?";

function renderPart7(answers: QuizAnswers, onAnswerChange: (...args: unknown[]) => void = vi.fn()) {
  const utils = render(
    React.createElement(QuizPartRenderer, { items: PART_7_ITEMS, answers, onAnswerChange })
  );
  return { onAnswerChange, ...utils };
}

describe("Part 6 item list sanity (non-vacuity control)", () => {
  it("itemsForPart(QUIZ_PARTS, 5) is non-empty and contains the known HIST item IDs", () => {
    expect(PART_6_ITEMS.length).toBeGreaterThan(0);
    const ids = PART_6_ITEMS.map((item) => item.id);
    expect(ids).toContain("history_comorbidities");
    expect(ids).toContain("has_pcp");
    expect(ids).toContain("no_pcp_recommendation");
  });
});

describe("HIST-04 info block — the session-32 failure shape", () => {
  it('renders role="note" with the locked recommendation when has_pcp is "no", and removes it when "yes"', () => {
    const { rerender } = renderPart6({ has_pcp: "no" });
    const note = screen.getByRole("note");
    expect(note.textContent).toContain(NO_PCP_SENTENCE);

    rerender(
      React.createElement(QuizPartRenderer, {
        items: PART_6_ITEMS,
        answers: { has_pcp: "yes" },
        onAnswerChange: vi.fn(),
      })
    );
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("HIST-04 clinic fields", () => {
  it('shows both clinic-field labels when has_pcp is "yes" and hides both when "no"', () => {
    const { rerender } = renderPart6({ has_pcp: "yes" });
    expect(screen.getByText(CLINIC_NAME_LABEL)).toBeTruthy();
    expect(screen.getByText(CLINIC_ADDRESS_LABEL)).toBeTruthy();

    rerender(
      React.createElement(QuizPartRenderer, {
        items: PART_6_ITEMS,
        answers: { has_pcp: "no" },
        onAnswerChange: vi.fn(),
      })
    );
    expect(screen.queryByText(CLINIC_NAME_LABEL)).toBeNull();
    expect(screen.queryByText(CLINIC_ADDRESS_LABEL)).toBeNull();
  });

  it("never renders the note and both clinic fields at once, for either has_pcp value", () => {
    renderPart6({ has_pcp: "yes" });
    const noteWhenYes = screen.queryByRole("note");
    const clinicFieldsPresentWhenYes =
      screen.queryByText(CLINIC_NAME_LABEL) !== null && screen.queryByText(CLINIC_ADDRESS_LABEL) !== null;
    expect(noteWhenYes).toBeNull();
    expect(clinicFieldsPresentWhenYes).toBe(true);
    cleanup();

    renderPart6({ has_pcp: "no" });
    const noteWhenNo = screen.queryByRole("note");
    const clinicFieldsPresentWhenNo =
      screen.queryByText(CLINIC_NAME_LABEL) !== null && screen.queryByText(CLINIC_ADDRESS_LABEL) !== null;
    expect(noteWhenNo).not.toBeNull();
    expect(clinicFieldsPresentWhenNo).toBe(false);
  });
});

describe("HIST-01 exclusivity — the session-33 failure shape, at the DOM level", () => {
  it("renders exactly 11 comorbidity checkboxes, none disabled, while 'None of the above' is selected", () => {
    renderPart6({ history_comorbidities: ["none"] });
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    // A count assertion, not merely "greater than zero" — this is what prevents the
    // zero-disabled assertion below from passing vacuously against an empty query result.
    expect(checkboxes.length).toBe(11);
    for (const checkbox of checkboxes) {
      expect(checkbox.disabled).toBe(false);
      expect(checkbox.hasAttribute("aria-disabled")).toBe(false);
    }
  });

  it("switches to the clicked option in one click (D-07 / the D-13 reversal)", () => {
    const onAnswerChange = vi.fn();
    renderPart6({ history_comorbidities: ["none"] }, onAnswerChange);
    const asthmaLabel = screen.getByText("Asthma").closest("label");
    expect(asthmaLabel).not.toBeNull();
    const asthmaCheckbox = asthmaLabel!.querySelector('input[type="checkbox"]');
    expect(asthmaCheckbox).not.toBeNull();
    fireEvent.click(asthmaCheckbox as Element);
    expect(onAnswerChange).toHaveBeenCalledWith("history_comorbidities", ["asthma"]);
  });

  it("has no pointer-events:none inline style and no aria-disabled attribute anywhere in the render", () => {
    const { container } = renderPart6({ history_comorbidities: ["none"] });
    const withInlineStyle = container.querySelectorAll("[style]");
    for (const el of Array.from(withInlineStyle)) {
      expect((el as HTMLElement).style.pointerEvents).not.toBe("none");
    }
    expect(container.querySelectorAll("[aria-disabled]").length).toBe(0);
  });
});

/**
 * HIST-02 became a gate + reveal pair during browser UAT (session 33) — see the long note in
 * `app/lib/quiz/schema.test.ts`. This block previously asserted the `isAnswered` reveal directly
 * on the medications field; that operator now lives nowhere in the production question set, so
 * asserting it here would be asserting a contract the data no longer has.
 *
 * What replaces it is the thing that actually matters to a patient: a healthy person must be able
 * to get through Part 6 without typing.
 */
describe("HIST-02 gate + reveal — the session-33 friction fix, at the DOM level", () => {
  it("shows no medications field until the gate is 'yes', and shows it once it is", () => {
    const { rerender } = renderPart6({});
    // The gate itself is unconditional, so it renders immediately — no chain to evaluate.
    expect(screen.queryByText(MEDICATIONS_LABEL)).toBeNull();

    rerender(
      React.createElement(QuizPartRenderer, {
        items: PART_6_ITEMS,
        answers: { history_medications_has: "no" },
        onAnswerChange: vi.fn(),
      })
    );
    // "No" is the escape a healthy patient now has — nothing to type.
    expect(screen.queryByText(MEDICATIONS_LABEL)).toBeNull();

    rerender(
      React.createElement(QuizPartRenderer, {
        items: PART_6_ITEMS,
        answers: { history_medications_has: "yes" },
        onAnswerChange: vi.fn(),
      })
    );
    // Non-vacuity control: the label IS reachable, so the two nulls above mean something.
    expect(screen.getByText(MEDICATIONS_LABEL)).toBeTruthy();
  });

  it("never renders the medications field off a comorbidity answer alone — the chain the forward guard rejects", () => {
    // Regression guard for the first attempt at this fix, which gated the new question on
    // `history_comorbidities` and built a two-level chain. `evaluateShowIf` is non-transitive, so
    // that let a stale gate answer leave this field rendering with its gate hidden.
    renderPart6({ history_comorbidities: ["asthma"] });
    expect(screen.queryByText(MEDICATIONS_LABEL)).toBeNull();
  });
});

describe("Info block collects no answer (D-11)", () => {
  it("contains no input, textarea, select, or button, and never calls onAnswerChange during render", () => {
    const onAnswerChange = vi.fn();
    renderPart6({ has_pcp: "no" }, onAnswerChange);
    const note = screen.getByRole("note");
    expect(within(note).queryAllByRole("textbox").length).toBe(0);
    expect(note.querySelectorAll("input, textarea, select, button").length).toBe(0);
    expect(onAnswerChange).not.toHaveBeenCalled();
  });
});

/**
 * Part 7 (04-07). TEST-01: exactly two options, gated Next. TEST-02: the needs_testing branch
 * collects nothing beyond the choice itself. TEST-03: year/location/allergens are reachable and
 * capturable on the had_testing branch. All against the REAL PART_7_ITEMS through the REAL
 * renderer, per this file's stated purpose.
 */
describe("Part 7 item list sanity (non-vacuity control)", () => {
  it("itemsForPart(QUIZ_PARTS, 6) is non-empty and contains the known Part 7 item IDs", () => {
    expect(PART_7_ITEMS.length).toBeGreaterThan(0);
    const ids = PART_7_ITEMS.map((item) => item.id);
    expect(ids).toContain("testing_status");
    expect(ids).toContain("testing_year");
    expect(ids).toContain("testing_location");
    expect(ids).toContain("testing_allergens");
  });
});

describe("TEST-01 — testing_status renders exactly two options and nothing else before a choice", () => {
  it("renders exactly two radio inputs with the two locked-verbatim accessible labels, and no skip control", () => {
    renderPart7({});
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.length).toBe(2);

    // Verbatim accessible-label assertions, including the apostrophe in the second label.
    expect(screen.getByText(NEEDS_TESTING_LABEL)).toBeTruthy();
    expect(screen.getByText(HAD_TESTING_LABEL)).toBeTruthy();

    // No third option, no skip/button control anywhere in the render.
    expect(screen.queryAllByRole("checkbox").length).toBe(0);
    expect(screen.queryAllByRole("button").length).toBe(0);
  });

  it("renders no text input or textarea before a choice is made", () => {
    renderPart7({});
    expect(screen.queryAllByRole("textbox").length).toBe(0);
  });
});

describe("TEST-02 — needs_testing branch collects nothing beyond the choice itself", () => {
  it("shows zero text inputs/textareas when testing_status is 'needs_testing'", () => {
    renderPart7({ testing_status: "needs_testing" });
    expect(screen.queryAllByRole("textbox").length).toBe(0);
    expect(screen.queryByText(TESTING_YEAR_LABEL)).toBeNull();
    expect(screen.queryByText(TESTING_LOCATION_LABEL)).toBeNull();
    expect(screen.queryByText(TESTING_ALLERGENS_LABEL)).toBeNull();
  });
});

describe("TEST-03 — had_testing branch reveals year, location, and allergens", () => {
  it("renders all three additional controls, matched by their visible question text", () => {
    renderPart7({ testing_status: "had_testing" });
    expect(screen.getByText(TESTING_YEAR_LABEL, { exact: false })).toBeTruthy();
    expect(screen.getByText(TESTING_LOCATION_LABEL, { exact: false })).toBeTruthy();
    // Locked verbatim copy — asserted exactly, not a substring match.
    expect(screen.getByText(TESTING_ALLERGENS_LABEL)).toBeTruthy();

    const textboxes = screen.getAllByRole("textbox");
    expect(textboxes.length).toBe(3);
  });

  it("fires onAnswerChange('testing_year', <typed value>) when the year field is typed into", () => {
    const onAnswerChange = vi.fn();
    renderPart7({ testing_status: "had_testing" }, onAnswerChange);
    const yearLabel = screen.getByText(TESTING_YEAR_LABEL, { exact: false });
    const yearInput = yearLabel.closest("div")?.querySelector("input, textarea");
    expect(yearInput).not.toBeNull();
    fireEvent.change(yearInput as Element, { target: { value: "2019" } });
    expect(onAnswerChange).toHaveBeenCalledWith("testing_year", "2019");
  });

  it("fires onAnswerChange('testing_status', 'had_testing') when that radio is selected", () => {
    const onAnswerChange = vi.fn();
    renderPart7({}, onAnswerChange);
    const hadTestingLabel = screen.getByText(HAD_TESTING_LABEL).closest("label");
    expect(hadTestingLabel).not.toBeNull();
    const radio = hadTestingLabel!.querySelector('input[type="radio"]');
    expect(radio).not.toBeNull();
    fireEvent.click(radio as Element);
    expect(onAnswerChange).toHaveBeenCalledWith("testing_status", "had_testing");
  });
});

describe("Part 7 gating — the real isPartComplete, imported from the renderer module", () => {
  it("is incomplete with no answers", () => {
    expect(isPartComplete(PART_7_ITEMS, {})).toBe(false);
  });

  it("is complete once testing_status is 'needs_testing' — no children to satisfy", () => {
    expect(isPartComplete(PART_7_ITEMS, { testing_status: "needs_testing" })).toBe(true);
  });

  it("is incomplete on 'had_testing' alone, before the three revealed fields are filled", () => {
    expect(isPartComplete(PART_7_ITEMS, { testing_status: "had_testing" })).toBe(false);
  });

  it("is complete once all three revealed fields are filled with non-whitespace text", () => {
    expect(
      isPartComplete(PART_7_ITEMS, {
        testing_status: "had_testing",
        testing_year: "2019",
        testing_location: "X",
        testing_allergens: "Y",
      })
    ).toBe(true);
  });

  it("is incomplete when a revealed field is whitespace-only (T-4-23's trim() guard)", () => {
    expect(
      isPartComplete(PART_7_ITEMS, {
        testing_status: "had_testing",
        testing_year: "  ",
        testing_location: "X",
        testing_allergens: "Y",
      })
    ).toBe(false);
  });
});
