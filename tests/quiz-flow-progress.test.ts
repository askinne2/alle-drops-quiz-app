import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { quizFlowProgress } from "../app/lib/quiz/schema";
import { QUIZ_PARTS } from "../app/lib/quiz/questions";

/**
 * Guards UAT defect #6 (session 35): the progress counter rendered "Step 2 of 9" on the intro
 * screens and then switched both noun and denominator to "Part 1 of 7" for the quiz parts. Both
 * numbers were internally correct and the pair still read as a contradiction. Consent was also
 * uncounted despite D-09 making it mandatory for every bracket.
 */
describe("quizFlowProgress", () => {
  const TOTAL_PARTS = QUIZ_PARTS.length;
  const EXPECTED_TOTAL = TOTAL_PARTS + 3; // + state_gate, patient_info, consent

  it("numbers every screen in one unbroken sequence with one denominator", () => {
    const labels = [
      quizFlowProgress({ kind: "state_gate" }, TOTAL_PARTS)?.label,
      quizFlowProgress({ kind: "patient_info" }, TOTAL_PARTS)?.label,
      ...Array.from(
        { length: TOTAL_PARTS },
        (_, i) => quizFlowProgress({ kind: "quiz_part", index: i }, TOTAL_PARTS)?.label
      ),
      quizFlowProgress({ kind: "consent" }, TOTAL_PARTS)?.label,
    ];

    const expected = Array.from(
      { length: EXPECTED_TOTAL },
      (_, i) => `Step ${i + 1} of ${EXPECTED_TOTAL}`
    );

    expect(labels).toEqual(expected);
  });

  it("never emits the word 'Part' in a label — the noun switch was the defect", () => {
    const everyStep = [
      quizFlowProgress({ kind: "state_gate" }, TOTAL_PARTS),
      quizFlowProgress({ kind: "patient_info" }, TOTAL_PARTS),
      ...Array.from({ length: TOTAL_PARTS }, (_, i) =>
        quizFlowProgress({ kind: "quiz_part", index: i }, TOTAL_PARTS)
      ),
      quizFlowProgress({ kind: "consent" }, TOTAL_PARTS),
    ];

    for (const s of everyStep) {
      expect(s?.label).toMatch(/^Step \d+ of \d+$/);
      expect(s?.label).not.toContain("Part");
    }
  });

  it("uses exactly one denominator across the whole flow", () => {
    const denominators = new Set(
      [
        quizFlowProgress({ kind: "state_gate" }, TOTAL_PARTS),
        quizFlowProgress({ kind: "quiz_part", index: 0 }, TOTAL_PARTS),
        quizFlowProgress({ kind: "consent" }, TOTAL_PARTS),
      ].map((s) => s?.label.split(" of ")[1])
    );
    expect(denominators.size).toBe(1);
    expect([...denominators][0]).toBe(String(EXPECTED_TOTAL));
  });

  it("counts consent as the final step, not an unnumbered extra", () => {
    const consent = quizFlowProgress({ kind: "consent" }, TOTAL_PARTS);
    expect(consent?.label).toBe(`Step ${EXPECTED_TOTAL} of ${EXPECTED_TOTAL}`);
    const lastPart = quizFlowProgress({ kind: "quiz_part", index: TOTAL_PARTS - 1 }, TOTAL_PARTS);
    expect(lastPart?.label).toBe(`Step ${EXPECTED_TOTAL - 1} of ${EXPECTED_TOTAL}`);
  });

  it("advances the fill monotonically from 0 and never reaches 100 before the last step", () => {
    const fills = [
      quizFlowProgress({ kind: "state_gate" }, TOTAL_PARTS)!.fillPct,
      quizFlowProgress({ kind: "patient_info" }, TOTAL_PARTS)!.fillPct,
      ...Array.from(
        { length: TOTAL_PARTS },
        (_, i) => quizFlowProgress({ kind: "quiz_part", index: i }, TOTAL_PARTS)!.fillPct
      ),
      quizFlowProgress({ kind: "consent" }, TOTAL_PARTS)!.fillPct,
    ];

    expect(fills[0]).toBe(0);
    for (let i = 1; i < fills.length; i++) expect(fills[i]).toBeGreaterThan(fills[i - 1]);
    expect(fills[fills.length - 1]).toBeLessThan(100);
  });

  it("returns null for screens that carry no progress bar", () => {
    expect(quizFlowProgress(null, TOTAL_PARTS)).toBeNull();
  });

  it("tracks QUIZ_PARTS automatically — adding a part shifts the total, not the code", () => {
    expect(quizFlowProgress({ kind: "consent" }, 5)?.label).toBe("Step 8 of 8");
    expect(quizFlowProgress({ kind: "consent" }, 9)?.label).toBe("Step 12 of 12");
  });
});

/**
 * Source guard: the container must not rebuild the counter locally. Both prior defects in this
 * area came from arithmetic living in the component where nothing could unit-test it.
 */
describe("QuizContainer progress wiring", () => {
  const source = readFileSync(
    new URL("../app/components/quiz/QuizContainer.tsx", import.meta.url),
    "utf8"
  );
  const count = (needle: string) => source.split(needle).length - 1;

  it("delegates to the pure evaluator rather than formatting a label itself", () => {
    expect(count("quizFlowProgress")).toBeGreaterThanOrEqual(2); // import + call
    expect(count("`Step ")).toBe(0);
    expect(count("`Part ")).toBe(0);
    expect(count("TOTAL_FLOW_STEPS")).toBe(0);
  });
});
