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
import { QuizPartRenderer } from "../app/components/quiz/QuizPartRenderer";
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

describe("HIST-02 reveal — the case `equals` cannot express (D-08 / isAnswered)", () => {
  it("is absent with no answers, present after a comorbidity selection, and present for 'none of the above'", () => {
    const { rerender } = renderPart6({});
    expect(screen.queryByText(MEDICATIONS_LABEL)).toBeNull();

    rerender(
      React.createElement(QuizPartRenderer, {
        items: PART_6_ITEMS,
        answers: { history_comorbidities: ["asthma"] },
        onAnswerChange: vi.fn(),
      })
    );
    expect(screen.getByText(MEDICATIONS_LABEL)).toBeTruthy();

    // The case `equals` cannot express — isAnswered fires on ["none"] too.
    rerender(
      React.createElement(QuizPartRenderer, {
        items: PART_6_ITEMS,
        answers: { history_comorbidities: ["none"] },
        onAnswerChange: vi.fn(),
      })
    );
    expect(screen.getByText(MEDICATIONS_LABEL)).toBeTruthy();
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
