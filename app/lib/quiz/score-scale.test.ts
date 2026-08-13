import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getScoreScale } from "./score-scale";
import { getMaxScore, SCORE_BRACKETS } from "./scoring";
import { ALL_SCORED_QUESTIONS } from "./questions";

describe("getScoreScale: max is derived, not a literal", () => {
  it("max equals getMaxScore(ALL_SCORED_QUESTIONS) and equals 60", () => {
    const scale = getScoreScale();
    expect(scale.max).toBe(getMaxScore(ALL_SCORED_QUESTIONS));
    expect(scale.max).toBe(60);
  });

  it("has no own property named isProvisional", () => {
    expect(Object.prototype.hasOwnProperty.call(getScoreScale(), "isProvisional")).toBe(false);
  });
});

describe("getScoreScale: zone shape invariants", () => {
  // CHANGED 2026-08-13 (was 2/6/60). Clinical brackets moved from 0-2/3-6/7+ to 0-2/3-8/9+ —
  // .planning/phases/05.2-clinical-bracket-revision/05.2-SOURCE-william-2026-08-13.md.
  it("has exactly three zones in the locked ascending order: 2/low/Low, 8/mid/Moderate, 60/high/High", () => {
    const { zones } = getScoreScale();
    expect(zones).toEqual([
      { upTo: 2, tone: "low", label: "Low" },
      { upTo: 8, tone: "mid", label: "Moderate" },
      { upTo: 60, tone: "high", label: "High" },
    ]);
  });

  // CHANGED 2026-08-12 (was 20/40/60). Andrew chose one colour per clinical bracket after
  // reviewing the shipped page. The literals above are asserted deliberately rather than read back
  // from SCORE_BRACKETS: a test that derives its expectation from the same source as the code
  // proves only that the code is self-consistent. These numbers are a clinical decision and a
  // change to them should have to be made twice, on purpose.
  it("each zone boundary equals the clinical bracket boundary it mirrors, so colour and bracket cannot drift apart", () => {
    const { zones, max } = getScoreScale();
    expect(zones[0].upTo).toBe(SCORE_BRACKETS.LOW.max);
    expect(zones[1].upTo).toBe(SCORE_BRACKETS.MID.max);
    // SCORE_BRACKETS.HIGH.max is Infinity; the bar closes at the derived ceiling instead.
    expect(SCORE_BRACKETS.HIGH.max).toBe(Infinity);
    expect(zones[2].upTo).toBe(max);
  });

  it("every zone's upTo is strictly greater than its predecessor's, the first is greater than 0, and the last equals max (no gap, no overhang)", () => {
    const { zones, max } = getScoreScale();
    expect(zones[0].upTo).toBeGreaterThan(0);
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i].upTo).toBeGreaterThan(zones[i - 1].upTo);
    }
    expect(zones[zones.length - 1].upTo).toBe(max);
  });

  it("every zone's tone is a member of the five-value ScaleTone union", () => {
    const validTones = new Set(["low", "low-mid", "mid", "mid-high", "high"]);
    for (const zone of getScoreScale().zones) {
      expect(validTones.has(zone.tone)).toBe(true);
    }
  });
});

describe("SCORE-02 source guard: max is assigned from getMaxScore(, never a numeric literal", () => {
  const source = readFileSync(join(process.cwd(), "app/lib/quiz/score-scale.ts"), "utf-8");

  it("assigns max from a getMaxScore( call", () => {
    expect(/max:\s*getMaxScore\(/.test(source)).toBe(true);
  });

  it("does not assign max from a numeric literal", () => {
    expect(/max:\s*\d/.test(source)).toBe(false);
  });
});
