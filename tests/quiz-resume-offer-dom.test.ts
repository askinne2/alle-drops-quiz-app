// @vitest-environment jsdom
/**
 * tests/quiz-resume-offer-dom.test.ts
 *
 * DOM proof for Phase 04.2's new patient-facing surfaces (RESUME-01, RESUME-03, D-06, D-08).
 * Renders the REAL `ResumeOffer`, `StartOverControl`, and `RestorationNotice` components — no
 * synthetic stand-ins — and asserts on the resulting DOM tree with `@testing-library/react` +
 * `jsdom`, following the house convention set by `tests/quiz-part-renderer-dom.test.ts` and
 * `tests/quiz-file-upload-dom.test.ts`.
 *
 * WHY .ts, NOT .tsx — same reason as the two files above: `vitest.config.ts`'s `include` glob
 * does not match `.test.tsx`. Elements are constructed with `React.createElement`, never JSX.
 *
 * D-06's zero-identity promise is proven below by an exact, closed-world `textContent` equality,
 * not merely a list of pattern absences — a stronger assertion, since it also catches any future
 * copy addition this file was never updated to expect. The pattern-absence checks are added on
 * top so the intent stays legible to a future reader who only skims one assertion.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { ResumeOffer, StartOverControl, RestorationNotice } from "../app/components/quiz/ResumeOffer";

afterEach(() => {
  cleanup();
});

/** Collapse all whitespace runs to a single space and trim — the whitespace-tolerant form of a
 *  closed-world textContent comparison this plan's acceptance criteria call for. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const OFFER_HEADING = "You have an unfinished assessment from earlier.";
const OFFER_SUBTITLE = "Resume where you left off, or start over?";
const OFFER_CONFIRM_HEADING = "Start over and lose your saved answers?";
const OFFER_CONFIRM_BODY = "This clears everything you entered earlier. This can't be undone.";
const INFLOW_CONFIRM_HEADING = "Start over and lose your progress?";
const INFLOW_CONFIRM_BODY =
  "This clears everything you've entered in this assessment so far. This can't be undone.";

describe("RESUME-01 / D-06 — ResumeOffer reveals zero identity", () => {
  it("resting-state textContent is exactly the four locked strings, and nothing else", () => {
    const { container } = render(
      React.createElement(ResumeOffer, { onResume: vi.fn(), onStartOver: vi.fn() })
    );
    const expected = OFFER_HEADING + OFFER_SUBTITLE + "Resume" + "Start over";
    expect(collapseWhitespace(container.textContent ?? "")).toBe(collapseWhitespace(expected));
  });

  it("matches no email, date, or elapsed-time pattern, and renders no <input>", () => {
    const { container } = render(
      React.createElement(ResumeOffer, { onResume: vi.fn(), onStartOver: vi.fn() })
    );
    const text = container.textContent ?? "";
    expect(text.includes("@")).toBe(false);
    expect(/\d{4}-\d{2}-\d{2}/.test(text)).toBe(false);
    expect(/\d+\s*(second|minute|hour|day)/i.test(text)).toBe(false);
    expect(container.querySelector("input")).toBeNull();
  });
});

describe("RESUME-01 — Resume calls onResume once and never onStartOver", () => {
  it("clicking Resume fires only onResume", () => {
    const onResume = vi.fn();
    const onStartOver = vi.fn();
    render(React.createElement(ResumeOffer, { onResume, onStartOver }));
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onStartOver).not.toHaveBeenCalled();
  });
});

describe("RESUME-03 / D-08 — the confirm gate (resume-offer variant)", () => {
  it("clicking Start over does not call onStartOver, and opens the confirm panel", () => {
    const onStartOver = vi.fn();
    render(React.createElement(ResumeOffer, { onResume: vi.fn(), onStartOver }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(onStartOver).not.toHaveBeenCalled();
    expect(screen.getByText(OFFER_CONFIRM_HEADING)).toBeTruthy();
    expect(screen.getByText(OFFER_CONFIRM_BODY)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep my answers" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, start over" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("focuses the dismiss button (Keep my answers), not the destructive button, on open", () => {
    render(React.createElement(ResumeOffer, { onResume: vi.fn(), onStartOver: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep my answers" }));
  });

  it("Keep my answers collapses the panel back to the two-button row without calling onStartOver", () => {
    const onStartOver = vi.fn();
    render(React.createElement(ResumeOffer, { onResume: vi.fn(), onStartOver }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep my answers" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
    expect(onStartOver).not.toHaveBeenCalled();
  });

  it("Yes, start over calls onStartOver exactly once", () => {
    const onStartOver = vi.fn();
    render(React.createElement(ResumeOffer, { onResume: vi.fn(), onStartOver }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, start over" }));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});

describe("RESUME-03 — in-flow variant (StartOverControl)", () => {
  it("visible label is exactly 'Start over', icon is aria-hidden, click opens the panel without firing onStartOver", () => {
    const onStartOver = vi.fn();
    const { container } = render(React.createElement(StartOverControl, { onStartOver }));
    const trigger = screen.getByRole("button", { name: "Start over" });
    expect(collapseWhitespace(trigger.textContent ?? "")).toBe("Start over");
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(trigger);
    expect(onStartOver).not.toHaveBeenCalled();
  });

  it("shows the in-flow confirm copy and the 'Keep my progress' dismiss label", () => {
    render(React.createElement(StartOverControl, { onStartOver: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText(INFLOW_CONFIRM_HEADING)).toBeTruthy();
    expect(screen.getByText(INFLOW_CONFIRM_BODY)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep my progress" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes, start over" })).toBeTruthy();
  });
});

describe("Accessibility contract — no dialog role, one aria-live container per open panel", () => {
  it("ResumeOffer's confirm panel carries aria-live polite and no dialog/alertdialog role", () => {
    const { container } = render(
      React.createElement(ResumeOffer, { onResume: vi.fn(), onStartOver: vi.fn() })
    );
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(container.querySelectorAll('[role="dialog"], [role="alertdialog"]').length).toBe(0);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("StartOverControl's confirm panel carries aria-live polite and no dialog/alertdialog role", () => {
    const { container } = render(React.createElement(StartOverControl, { onStartOver: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(container.querySelectorAll('[role="dialog"], [role="alertdialog"]').length).toBe(0);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});

describe("RestorationNotice — zero identity, zero counts", () => {
  it("renders the exact locked string, role note, and no @, date, or digit at all", () => {
    const { container } = render(React.createElement(RestorationNotice));
    expect(collapseWhitespace(container.textContent ?? "")).toBe(
      "Your previous answers have been restored."
    );
    expect(container.querySelector('[role="note"]')).not.toBeNull();
    const text = container.textContent ?? "";
    expect(text.includes("@")).toBe(false);
    expect(/\d{4}-\d{2}-\d{2}/.test(text)).toBe(false);
    expect(/\d/.test(text)).toBe(false);
  });
});
