// @vitest-environment jsdom
/**
 * tests/quiz-results-scale-bar-dom.test.ts
 *
 * FIRST DEDICATED `ResultsDisplay` TEST IN THIS REPOSITORY. Six defects have shipped past a fully
 * green suite on this project (see `tests/quiz-part-renderer-dom.test.ts`'s header for the first
 * three; three more followed in later phases), every one of them in code no test ever rendered.
 * `ResultsDisplay` — the terminal screen every patient's assessment ends on — has never had its
 * own test file before Phase 5. Two of this component's failure modes are the sharpest examples
 * of that blind spot, and both are invisible to a source-text guard:
 *   - the scale bar's tone could be silently re-wired from `scoreBracket` instead of the raw
 *     score, which would put a `7+` patient (54 of 60 points, 90% of the bar) visually "in the
 *     red" even when their actual score sits in the low zone — exactly the outcome D-05 exists to
 *     prevent, and a plain grep for the word "red" or "scoreBracket" proves nothing about which
 *     value actually drives the rendered `data-tone`;
 *   - the position marker could be silently reparented inside the clipped, rounded `.scaleBar__zones`
 *     wrapper, which slices it into a half-moon at score 0 or score max — score 0 is a genuine
 *     minimal-symptom outcome, not an edge case, so this would render visibly broken for real
 *     patients and a source-text guard cannot see DOM nesting at all.
 * Both are cheap to catch in jsdom and expensive to catch any other way. This file catches them.
 *
 * WHY .ts, NOT .tsx. `vitest.config.ts`'s `include` glob is
 * `["app/**\/*.test.ts", "tests/**\/*.test.ts"]` and does not match `.test.tsx` — widening it is a
 * config change with a wider blast radius than this plan warrants (05-04-PLAN.md's `<interfaces>`
 * section, copying `tests/quiz-part-renderer-dom.test.ts`'s identical note). Elements are
 * constructed with `React.createElement`, not JSX.
 *
 * WHAT THIS FILE DOES NOT PROVE. jsdom proves a node exists in a tree with the right attributes;
 * it cannot prove the bar paints the right pixel color, that the zone-boundary seam is visible
 * against every tone, or that the legend does not visually overlap at a real 375px viewport. The
 * manual greyscale/375px verification budgeted in plan 05-06 is NOT discharged by this file — see
 * `05-VALIDATION.md`'s Manual-Only Verifications table.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ResultsDisplay, type ResultsDisplayProps } from "../app/components/quiz/ResultsDisplay";
import { getScoreScale } from "../app/lib/quiz/score-scale";

afterEach(() => {
  cleanup();
});

// Synthetic, PHI-adjacent-safe baseline. `ResultsDisplay` takes no name/dob/email/phone prop, and
// none may be introduced into this fixture — see 05-04-PLAN.md's threat T-5-21.
const BASE_PROPS: ResultsDisplayProps = {
  score: 7,
  scoreBracket: "7+",
  patientState: "tennessee",
  symptomProfileId: "AOD_TEST_0001",
  testingStatus: "had_testing",
};

function renderResults(overrides: Partial<ResultsDisplayProps> = {}) {
  return render(React.createElement(ResultsDisplay, { ...BASE_PROPS, ...overrides }));
}

/**
 * Locates the scale bar's structural parts without relying on any hashed CSS Modules class name.
 * The marker is derived as "the track child that is not the zones wrapper," and the zones wrapper
 * is derived as "the track child that contains the [data-tone] elements" — both per
 * 05-04-PLAN.md's `<interfaces>` query strategy, and both survive a class-name rename.
 */
function getScaleBarParts(container: HTMLElement) {
  const track = container.querySelector('[role="img"]') as HTMLElement | null;
  if (!track) throw new Error("scale bar track ([role=\"img\"]) not found");

  const trackChildren = Array.from(track.children) as HTMLElement[];
  const zonesWrapper = trackChildren.find((child) => child.querySelector("[data-tone]") !== null);
  if (!zonesWrapper) throw new Error("zones wrapper (track child containing [data-tone]) not found");

  const marker = trackChildren.find((child) => child !== zonesWrapper);
  if (!marker) throw new Error("marker (track child other than the zones wrapper) not found");

  const zoneElements = Array.from(zonesWrapper.querySelectorAll("[data-tone]")) as HTMLElement[];
  const currentLegendItem = container.querySelector('[data-current="true"]') as HTMLElement | null;

  return { track, zonesWrapper, marker, zoneElements, currentLegendItem };
}

/**
 * Reads each zone's flex-grow value from the SERVER-RENDERED markup rather than from jsdom's live
 * `CSSStyleDeclaration`.
 *
 * MEASURED (2026-08-11): this repo's jsdom/cssstyle version cannot parse the unitless-flex-basis
 * shorthand `flex: <n> 0 0` that `ResultsDisplay.tsx` actually renders — `element.style.flex` and
 * `element.style.flexGrow` both read back `""`, and critically, jsdom never even writes a `style`
 * attribute to the DOM node in that case (confirmed via `outerHTML`), so the plan's documented
 * fallback of "read the style attribute text and extract the leading number" has nothing to read
 * either; both of the plan's suggested strategies are unreachable under this jsdom version for
 * this specific shorthand syntax. `renderToStaticMarkup` serializes the identical component tree
 * to a literal HTML string without going through jsdom's CSSOM at all, so the real
 * `style="flex:20 0 0"` text is present there and can be parsed with a plain regex — this reads
 * the exact same value the browser receives, it just never touches jsdom's (buggy, for this
 * input) style parser.
 */
function getZoneFlexGrowValues(overrides: Partial<ResultsDisplayProps> = {}): number[] {
  const html = renderToStaticMarkup(React.createElement(ResultsDisplay, { ...BASE_PROPS, ...overrides }));
  const matches = [...html.matchAll(/data-tone="[a-z-]+"\s+style="flex:(-?\d+(?:\.\d+)?)/g)];
  if (matches.length === 0) {
    throw new Error("no zone flex-grow values found in server-rendered markup");
  }
  return matches.map((m) => Number(m[1]));
}

describe("SCORE-01 copy", () => {
  it('renders the h2 as "Preliminary Score"', () => {
    renderResults();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Preliminary Score");
  });

  it("renders the locked 1-2 business day subtitle sentence", () => {
    renderResults();
    expect(
      screen.getByText(
        "Our Clinical Team is reviewing your information, and will send you email confirmation of your final results within the next 1-2 business days.",
      ),
    ).toBeTruthy();
  });

  it('does not render "Your Assessment Results", "Your responses have been submitted.", or "Symptom Score:"', () => {
    const { container } = renderResults();
    const text = container.textContent ?? "";
    expect(text).not.toContain("Your Assessment Results");
    expect(text).not.toContain("Your responses have been submitted.");
    expect(text).not.toContain("Symptom Score:");
  });
});

describe("SCORE-02 derived readout", () => {
  it('renders "{score} of {max}" with max read from getScoreScale(), not a literal', () => {
    const scale = getScoreScale();
    renderResults({ score: 7 });
    expect(screen.getByText(`7 of ${scale.max}`)).toBeTruthy();
  });
});

describe("SCORE-03 zone rendering and proportional widths", () => {
  it("renders exactly getScoreScale().zones.length zone elements, in document order by tone", () => {
    const scale = getScoreScale();
    const { container } = renderResults();
    const { zoneElements } = getScaleBarParts(container);
    expect(zoneElements.length).toBe(scale.zones.length);
    expect(zoneElements.map((z) => z.getAttribute("data-tone"))).toEqual(
      scale.zones.map((z) => z.tone),
    );
  });

  /*
    CHANGED 2026-08-12. This test previously asserted the opposite: flex-grow === upTo minus the
    previous upTo, summing to max. That was correct while the zone boundaries were independent of
    the clinical brackets (20/40/60). They are now the bracket boundaries themselves (2/6/60), and
    span-proportional widths against those numbers paint 90% of the track red — the outcome D-05
    was written to prevent. Equal shares hold red to one third. The two changes are one decision;
    reverting either half alone reintroduces the 90%-red bar.
  */
  it("gives every zone an equal flex-grow share, independent of how many score points it spans", () => {
    const scale = getScoreScale();
    const flexGrowValues = getZoneFlexGrowValues();
    expect(flexGrowValues.length).toBe(scale.zones.length);

    for (const grow of flexGrowValues) {
      expect(grow).toBe(1);
    }

    // The guard that matters: the widest and narrowest zones span wildly different point counts
    // (54 vs 2), and must still render identically. A regression to proportional widths fails here.
    const spans = scale.zones.map(
      (zone, index) => zone.upTo - (index === 0 ? 0 : scale.zones[index - 1].upTo),
    );
    expect(Math.max(...spans)).toBeGreaterThan(Math.min(...spans) * 10);
    expect(new Set(flexGrowValues).size).toBe(1);
  });
});

/*
  SUPERSEDES "D-05 bar/bracket independence (load-bearing)", REWRITTEN 2026-08-12.

  The block that stood here asserted that a patient scoring 7 with bracket `7+` saw the LOW zone as
  current. It was the phase's single most important assertion, and its comment named exactly this
  change as the thing it existed to fail: "a future 'simplification' that derives the current zone
  or its tone from `scoreBracket` instead of `score` must fail this test."

  It is rewritten rather than deleted, and the reversal is deliberate rather than accidental.
  Andrew reviewed the shipped page against a live preview on 2026-08-12 and chose one colour per
  clinical bracket — a 7 now reads High. What D-05 was actually protecting was the patient scoring
  7 of 60 being shown as maximally severe, and that protection did not go away; it moved into the
  RENDERING. Equal-share zones hold the red band to one third of the track instead of 90%, and
  within-zone interpolation puts a 7 at red's far-left edge and a 60 at its far right. The two
  tests below guard that replacement, and one older guard survives unchanged in substance: the
  zone must still be computed from `score`, never read off the `scoreBracket` prop.

  Why that last one still matters even though the two now agree: `scoreBracket` arrives as a prop
  and is recomputed as a fallback in `payload.ts:101`, so a resumed or malformed submission can
  carry one that disagrees with its own score. If the bar read the prop, the bar would contradict
  the number in the circle. It must not.
*/
describe("colour tracks the clinical brackets, computed from score (load-bearing)", () => {
  it("score 7 with bracket 7+ shows the HIGH zone as current, alongside the 7+ recommendation", () => {
    const { container } = renderResults({ score: 7, scoreBracket: "7+" });
    const { currentLegendItem } = getScaleBarParts(container);
    expect(currentLegendItem?.textContent).toBe("High");
    expect(
      screen.getByText("Sublingual Immunotherapy May Significantly Help You"),
    ).toBeTruthy();
  });

  it("each bracket's boundary score lands in its own zone: 2 -> Low, 6 -> Moderate, 7 -> High", () => {
    const cases = [
      { score: 2, zone: "Low" },
      { score: 6, zone: "Moderate" },
      { score: 7, zone: "High" },
    ] as const;

    for (const { score, zone } of cases) {
      const { container, unmount } = renderResults({ score });
      expect(getScaleBarParts(container).currentLegendItem?.textContent).toBe(zone);
      unmount();
    }
  });

  it("the zone follows `score`, not the `scoreBracket` prop, when the two are made to disagree", () => {
    // Deliberately inconsistent input: a low score carrying a high bracket. The bar must describe
    // the number the patient can see in the circle.
    const { container } = renderResults({ score: 1, scoreBracket: "7+" });
    expect(getScaleBarParts(container).currentLegendItem?.textContent).toBe("Low");
    // The recommendation still follows the prop — the two are separately sourced, which is the
    // whole point of the assertion.
    expect(
      screen.getByText("Sublingual Immunotherapy May Significantly Help You"),
    ).toBeTruthy();
  });
});

describe("within-zone interpolation (what replaced D-05's protection)", () => {
  function markerPercent(overrides: Partial<ResultsDisplayProps>): number {
    const { container } = renderResults(overrides);
    const left = getScaleBarParts(container).marker.style.left;
    cleanup();
    return Number.parseFloat(left);
  }

  it("spreads the 7+ bracket across its whole third instead of pinning every 7+ patient to one spot", () => {
    const atThreshold = markerPercent({ score: 7, scoreBracket: "7+" });
    const middling = markerPercent({ score: 33, scoreBracket: "7+" });
    const ceiling = markerPercent({ score: 60, scoreBracket: "7+" });

    // All three sit inside the final third of the track...
    for (const p of [atThreshold, middling, ceiling]) {
      expect(p).toBeGreaterThanOrEqual((2 / 3) * 100);
      expect(p).toBeLessThanOrEqual(100);
    }

    // ...but strictly ordered within it, and meaningfully far apart. Without interpolation these
    // would collapse to a single position and a 7 would be indistinguishable from a 60.
    expect(atThreshold).toBeLessThan(middling);
    expect(middling).toBeLessThan(ceiling);
    expect(ceiling - atThreshold).toBeGreaterThan(30);
  });

  it("a score at the very bottom of the 7+ bracket sits at the left edge of the red third, not deep inside it", () => {
    const atThreshold = markerPercent({ score: 7, scoreBracket: "7+" });
    // Within two percentage points of the boundary at 66.67% — visually "just barely into red",
    // which is the outcome D-05 wanted and this rendering preserves.
    expect(atThreshold).toBeLessThan((2 / 3) * 100 + 2);
  });
});

describe("UX — circle caption and two-axis bridge", () => {
  // CHANGED 2026-08-12: score 7 now reads "High symptom burden", because the zones are the
  // clinical brackets. Andrew was shown this exact consequence before choosing it — a 7-of-60
  // patient reads "High symptom burden" directly under their number — and accepted it. Score 1 is
  // used for the low case so the assertion still proves the caption tracks the score.
  it('shows "{zone} symptom burden" under the circle, driven by raw score not scoreBracket', () => {
    renderResults({ score: 1, scoreBracket: "0-2" });
    expect(screen.getByText("Low symptom burden")).toBeTruthy();

    cleanup();
    renderResults({ score: 45, scoreBracket: "7+" });
    expect(screen.getByText("High symptom burden")).toBeTruthy();
  });

  it("renders the two-axis bridge sentence that separates burden from clinical meaning", () => {
    renderResults();
    expect(
      screen.getByText(
        "The bar shows how many symptoms you reported. Below is what that usually means for care.",
      ),
    ).toBeTruthy();
  });

  it('renders "{zone} on the symptom scale" under the locked meaning heading', () => {
    renderResults({ score: 1, scoreBracket: "0-2" });
    expect(screen.getByText("Low on the symptom scale")).toBeTruthy();
  });
});

describe("DOM structure — the marker-clipping regression guard", () => {
  it("the marker is a sibling of the zones wrapper under the track, never its descendant", () => {
    const { container } = renderResults();
    const { track, zonesWrapper, marker } = getScaleBarParts(container);
    expect(marker.parentElement).toBe(track);
    expect(zonesWrapper.contains(marker)).toBe(false);
  });
});

describe("Accessibility contract", () => {
  it("the track's aria-label carries score, ceiling, and the current zone's label, and names none of the clinical brackets", () => {
    const scale = getScoreScale();
    const { container } = renderResults({ score: 7, scoreBracket: "7+" });
    const { track } = getScaleBarParts(container);
    const label = track.getAttribute("aria-label") ?? "";

    expect(label).toContain("Symptom burden position");
    expect(label).toContain("7");
    expect(label).toContain(String(scale.max));
    // "high" as of 2026-08-12 — score 7 is the bottom of the 7+ bracket and the zones now mirror
    // the brackets. The assertion that matters is unchanged: the label names the ZONE, and names
    // no clinical bracket string.
    expect(label.toLowerCase()).toContain("high");

    expect(label).not.toContain("0-2");
    expect(label).not.toContain("3-6");
    expect(label).not.toContain("7+");
  });

  it('the "7 of {max}" readout is normal-flow text with no aria-hidden ancestor', () => {
    const scale = getScoreScale();
    const { container } = renderResults({ score: 7 });
    const readout = screen.getByText(`7 of ${scale.max}`);
    expect(readout.closest('[aria-hidden="true"]')).toBeNull();
    void container;
  });
});

describe("Edge scores", () => {
  it("score 0 renders without throwing, marker left is 0%, and exactly one zone is current", () => {
    const { container } = renderResults({ score: 0, scoreBracket: "0-2" });
    const { marker, currentLegendItem } = getScaleBarParts(container);
    expect(marker.style.left).toBe("0%");
    expect(currentLegendItem).not.toBeNull();
    expect(container.querySelectorAll('[data-current="true"]').length).toBe(1);
  });

  it("score at the scale's max renders without throwing, marker left is 100%, and exactly one zone is current", () => {
    const scale = getScoreScale();
    const { container } = renderResults({ score: scale.max, scoreBracket: "7+" });
    const { marker, currentLegendItem } = getScaleBarParts(container);
    expect(marker.style.left).toBe("100%");
    expect(currentLegendItem).not.toBeNull();
    expect(container.querySelectorAll('[data-current="true"]').length).toBe(1);
  });
});

describe("D-06 two-axis labelling", () => {
  it('renders "What this means for you" exactly once, for all three bracket values', () => {
    for (const bracket of ["0-2", "3-6", "7+"] as const) {
      const { container, unmount } = renderResults({ scoreBracket: bracket });
      const count = (container.textContent ?? "").split("What this means for you").length - 1;
      expect(count).toBe(1);
      unmount();
    }
  });
});

describe("D-09 verbatim band copy", () => {
  const bandHeadings: Record<ResultsDisplayProps["scoreBracket"], string> = {
    "0-2": "Your Symptoms Appear Mild and Well-Controlled",
    "3-6": "You May Benefit From Seeing an Allergist",
    "7+": "Sublingual Immunotherapy May Significantly Help You",
  };
  const DISCLAIMER_SENTENCE = "This assessment is a clinical symptom screening tool.";

  it("renders each bracket's locked band heading verbatim, and the disclaimer sentence in all three cases", () => {
    for (const bracket of Object.keys(bandHeadings) as Array<ResultsDisplayProps["scoreBracket"]>) {
      const { unmount } = renderResults({ scoreBracket: bracket });
      expect(screen.getByText(bandHeadings[bracket])).toBeTruthy();
      expect(screen.getByText(DISCLAIMER_SENTENCE, { exact: false })).toBeTruthy();
      unmount();
    }
  });
});

describe("D-04 no patient-facing provisional language", () => {
  it('rendered text contains nothing resembling "provisional", case-insensitively', () => {
    const { container } = renderResults();
    expect((container.textContent ?? "").toLowerCase()).not.toContain("provisional");
  });
});
