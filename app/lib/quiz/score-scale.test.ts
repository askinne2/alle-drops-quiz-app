import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getScoreScale } from "./score-scale";
import { getMaxScore } from "./scoring";
import { ALL_SCORED_QUESTIONS } from "./questions";

describe("getScoreScale: max is derived, not a literal", () => {
  it("max equals getMaxScore(ALL_SCORED_QUESTIONS) and equals 60", () => {
    const scale = getScoreScale();
    expect(scale.max).toBe(getMaxScore(ALL_SCORED_QUESTIONS));
    expect(scale.max).toBe(60);
  });

  it("isProvisional is true", () => {
    expect(getScoreScale().isProvisional).toBe(true);
  });
});

describe("getScoreScale: zone shape invariants", () => {
  it("has exactly three zones in the locked ascending order: 20/low/Low, 40/mid/Moderate, 60/high/High", () => {
    const { zones } = getScoreScale();
    expect(zones).toEqual([
      { upTo: 20, tone: "low", label: "Low" },
      { upTo: 40, tone: "mid", label: "Moderate" },
      { upTo: 60, tone: "high", label: "High" },
    ]);
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
