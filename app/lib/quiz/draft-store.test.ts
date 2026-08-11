// @vitest-environment jsdom
/**
 * app/lib/quiz/draft-store.test.ts
 *
 * Pins D-01 (both failure shapes — throwing AND silent no-op), D-05 (24h expiry with active
 * removeItem cleanup), D-11 (type-driven file-token strip on both write and read), and Finding 2's
 * fingerprint logic (structural, self-maintaining, rejects a stale shape). Also pins the
 * no-console-logging source guard CLAUDE.md requires for any file touching the draft object.
 *
 * WHY jsdom, not Node's bare `localStorage` global — 04.2-RESEARCH.md Assumption A6 flags Node's
 * bare global as unverified; jsdom is this repo's already-established DOM test convention
 * (`tests/quiz-file-upload-dom.test.ts`, `tests/quiz-part-renderer-dom.test.ts`).
 */

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DRAFT_EXPIRY_MS,
  DRAFT_STORAGE_KEY,
  clearDraft,
  currentSchemaFingerprint,
  isStorageAvailable,
  readDraft,
  schemaFingerprintFor,
  stripFileTokens,
  writeDraft,
  type QuizDraft,
  type QuizDraftInput,
} from "./draft-store";
import { ALL_ITEMS } from "./questions";
import type { QuizItem } from "./types";

afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // best-effort cleanup between tests
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function basePatientInfo() {
  return { name: "Jamie Test", dob: "1990-01-15", email: "jamie@example.com", phone: "6155551234" };
}

function baseDraftInput(answers: Record<string, string | string[] | number> = { testing_year: "2023" }): QuizDraftInput {
  return {
    step: "quiz_parts",
    patientState: "tennessee",
    patientInfo: basePatientInfo(),
    symptomProfileId: "AOD_test_fixture",
    currentPartIndex: 0,
    answers,
  };
}

describe("D-01 — throwing storage failure shape", () => {
  it("isStorageAvailable is false, readDraft is null, writeDraft/clearDraft do not throw", () => {
    // jsdom's Storage methods live on Storage.prototype, not the window.localStorage instance —
    // spying on the instance does not intercept calls made through it (confirmed by direct
    // measurement in-session), so the spy target must be the prototype.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(isStorageAvailable()).toBe(false);
    expect(readDraft()).toBeNull();
    expect(() => writeDraft(baseDraftInput())).not.toThrow();
    expect(() => clearDraft()).not.toThrow();
  });
});

describe("D-01 — silent no-op storage failure shape", () => {
  it("isStorageAvailable is false when setItem succeeds but getItem never reflects it", () => {
    // This is the branch Chrome actually exhibits per 04.2-RESEARCH.md's measured Chrome desktop
    // row (blocked/partitioned third-party storage does not throw). A try/catch-only detect would
    // wrongly report "available" here because nothing throws — only the round-trip equality check
    // catches this.
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);

    expect(isStorageAvailable()).toBe(false);
  });
});

describe("D-01 — positive control", () => {
  it("isStorageAvailable is true against real jsdom storage", () => {
    // Without this, both negative-case tests above could pass vacuously (e.g. if the canary logic
    // were broken in a way that always returned false).
    expect(isStorageAvailable()).toBe(true);
  });
});

describe("D-05 — 24h expiry, active cleanup", () => {
  it("readDraft returns null and removeItem is called once the draft is older than DRAFT_EXPIRY_MS", () => {
    const t0 = new Date("2026-01-01T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(t0);

    writeDraft(baseDraftInput());

    vi.setSystemTime(new Date(t0.getTime() + DRAFT_EXPIRY_MS + 1));
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

    expect(readDraft()).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith(DRAFT_STORAGE_KEY);
  });
});

describe("D-05 — boundary, draft still valid just under the expiry window", () => {
  it("readDraft returns non-null for a draft 1 second short of the expiry window", () => {
    // Without this, the expiry test above could pass by readDraft always returning null.
    const t0 = new Date("2026-01-01T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(t0);

    writeDraft(baseDraftInput());

    vi.setSystemTime(new Date(t0.getTime() + DRAFT_EXPIRY_MS - 1000));

    expect(readDraft()).not.toBeNull();
  });
});

describe("Fingerprint rejection — Finding 2", () => {
  it("discards and removes a draft written against a stale schema shape", () => {
    const staleDraft: QuizDraft = {
      schemaFingerprint: "stale-shape",
      savedAt: Date.now(),
      step: "quiz_parts",
      patientState: "tennessee",
      patientInfo: basePatientInfo(),
      symptomProfileId: "AOD_stale",
      currentPartIndex: 0,
      answers: { testing_year: "2023" },
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(staleDraft));

    expect(readDraft(currentSchemaFingerprint())).toBeNull();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe("Fingerprint sensitivity — proves the fingerprint is structural, not a constant", () => {
  it("differs when an item is removed from the list", () => {
    expect(schemaFingerprintFor(ALL_ITEMS)).not.toBe(schemaFingerprintFor(ALL_ITEMS.slice(1)));
  });

  it("differs when the first question's type changes", () => {
    const mutated: QuizItem[] = ALL_ITEMS.map((item, index) =>
      index === 0 && item.kind === "question" ? { ...item, type: "yesno" as const } : item
    );
    expect(schemaFingerprintFor(ALL_ITEMS)).not.toBe(schemaFingerprintFor(mutated));
  });
});

describe("Corrupt JSON", () => {
  it("readDraft returns null and does not throw", () => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, "{not json");
    expect(() => readDraft()).not.toThrow();
    expect(readDraft()).toBeNull();
  });
});

describe("Empty answers — D-07 defence in depth", () => {
  it("a structurally valid, unexpired, fingerprint-matching draft with empty answers reads back null", () => {
    const draft: QuizDraft = {
      schemaFingerprint: currentSchemaFingerprint(),
      savedAt: Date.now(),
      step: "quiz_parts",
      patientState: "tennessee",
      patientInfo: basePatientInfo(),
      symptomProfileId: "AOD_empty",
      currentPartIndex: 0,
      answers: {},
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));

    expect(readDraft()).toBeNull();
  });
});

describe("D-11 — file-token strip on write", () => {
  it("strips testing_files but keeps sibling Part 7 answers", () => {
    writeDraft(
      baseDraftInput({
        testing_status: "had_testing",
        testing_year: "2023",
        testing_files: ["tok_alpha_1", "tok_alpha_2"],
      })
    );

    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
    const count = (needle: string) => raw.split(needle).length - 1;

    expect(count("testing_files")).toBe(0);
    expect(count("tok_alpha_1")).toBe(0);
    expect(count("testing_year")).toBeGreaterThanOrEqual(1);
  });
});

describe("D-11 — file-token strip on read", () => {
  it("strips a hand-planted testing_files key (simulating a DevTools edit) before returning the draft", () => {
    const tampered: QuizDraft = {
      schemaFingerprint: currentSchemaFingerprint(),
      savedAt: Date.now(),
      step: "quiz_parts",
      patientState: "tennessee",
      patientInfo: basePatientInfo(),
      symptomProfileId: "AOD_tampered",
      currentPartIndex: 0,
      answers: { testing_year: "2023", testing_files: ["tok_tampered"] },
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(tampered));

    const result = readDraft();
    expect(result).not.toBeNull();
    expect(result?.answers).not.toHaveProperty("testing_files");
  });
});

describe("stripFileTokens — unit-level", () => {
  it("removes every file_multi-typed key and nothing else", () => {
    const stripped = stripFileTokens({
      testing_status: "had_testing",
      testing_files: ["tok_x"],
    });
    expect(stripped).toEqual({ testing_status: "had_testing" });
  });
});

describe("No-PHI-logging source guard", () => {
  it("draft-store.ts contains zero occurrences of the console. substring", () => {
    const source = readFileSync("app/lib/quiz/draft-store.ts", "utf8");
    expect(source.split("console.").length - 1).toBe(0);
  });
});
