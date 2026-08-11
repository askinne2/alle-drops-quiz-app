import { type QuizAnswers, type QuizItem } from "./types";
import { isQuestion } from "./schema";
import { ALL_ITEMS } from "./questions";

/**
 * Pure browser-local draft persistence for an in-progress intake (Phase 4.2, RESUME-01..04). No
 * React import, named exports only, nothing throws outward to a caller — mirrors the
 * `app/lib/quiz/schema.ts` / `app/lib/quiz/scoring.ts` house style: every failure degrades to a
 * safe default rather than propagating an exception into `QuizContainer`.
 *
 * This is a greenfield surface — no `localStorage`/`sessionStorage`/`indexedDB` code exists
 * anywhere else in this repo (confirmed by 04.2-PATTERNS.md's grep). The storage-specific logic
 * below (canary, fingerprint, expiry, strip) has no in-repo precedent and follows
 * 04.2-RESEARCH.md's Pattern 1 / Pattern 2 directly.
 *
 * CLAUDE.md compliance, non-negotiable: the draft object holds name, dob, email, phone, and
 * answers — all PHI. This file must never log to the console in any form, including inside a
 * catch block that might carry a caught error referencing the draft. Every catch below swallows
 * silently with a comment explaining why.
 */

/** localStorage key the draft is stored under. */
export const DRAFT_STORAGE_KEY = "alledrops_quiz_draft_v1";

/** D-05: a draft older than this is treated as absent and actively removed. */
export const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

const STORAGE_PROBE_KEY = "__alledrops_storage_probe__";
const STORAGE_PROBE_VALUE = "1";

/** The subset of intake state captured when a draft is written to identify the patient. */
export interface QuizDraftPatientInfo {
  name: string;
  dob: string;
  email: string;
  phone: string;
}

/**
 * The full shape persisted to `localStorage`. `schemaFingerprint` and `savedAt` are stamped by
 * `writeDraft` itself, never supplied by a caller — see `QuizDraftInput` below.
 */
export interface QuizDraft {
  schemaFingerprint: string;
  savedAt: number;
  step: "quiz_parts" | "consent";
  patientState: "tennessee" | "texas" | null;
  patientInfo: QuizDraftPatientInfo;
  symptomProfileId: string | null;
  currentPartIndex: number;
  answers: QuizAnswers;
}

/** What a caller supplies to `writeDraft` — everything in `QuizDraft` except the two fields the
 * module itself stamps (`schemaFingerprint`, `savedAt`), so a caller can never spoof either. */
export type QuizDraftInput = Omit<QuizDraft, "schemaFingerprint" | "savedAt">;

/**
 * Real write-read-remove round-trip canary against `window.localStorage`, never a bare
 * existence-check shortcut on the storage object.
 *
 * WHY a round trip and not a typeof/try-catch-only check: measured on Chrome desktop 2026-08-10
 * (04.2-RESEARCH.md § "Chrome desktop measurement"), Chrome does NOT throw when storage is
 * blocked or partitioned inside a cross-origin iframe — `setItem`/`getItem` both return
 * successfully but the write silently does not persist. A try/catch-only feature-detect would
 * wrongly report "available" on exactly this browser. Comparing the read-back value against what
 * was just written is the only thing that catches that silent-no-op failure shape; the throwing
 * failure shape (e.g. Safari ITP, a quota exception) is also caught because it lands in the same
 * catch block below. Guards `typeof window === "undefined"` first for SSR/server rendering, where
 * there is no `window` at all.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_PROBE_KEY, STORAGE_PROBE_VALUE);
    const readBack = window.localStorage.getItem(STORAGE_PROBE_KEY);
    window.localStorage.removeItem(STORAGE_PROBE_KEY);
    return readBack === STORAGE_PROBE_VALUE;
  } catch {
    // Storage threw (quota, Safari ITP, a hostile embedder). Treat as unavailable — never surface
    // this to the patient (D-01), and never log the caught error, which could carry state.
    return false;
  }
}

/**
 * Deterministic, unhashed structural fingerprint of a question-set shape. Self-maintaining by
 * design: it changes automatically the moment a question is added, removed, renamed, or retyped,
 * which is the exact failure class Phase 4.1's `QUIZ_PARTS` reorder would otherwise reopen — this
 * project has a documented, repeated history of hand-maintained version constants not getting
 * bumped when the underlying shape changes (STATE.md's Accumulated Context). Not hashed because
 * the value never leaves the browser; a readable string is easier to debug without ever needing to
 * log it.
 */
export function schemaFingerprintFor(items: QuizItem[]): string {
  return items
    .map((item) => `${item.kind}:${item.id}:${isQuestion(item) ? item.type : ""}`)
    .join("|");
}

/** The fingerprint of the currently-live question set, i.e. `schemaFingerprintFor(ALL_ITEMS)`. */
export function currentSchemaFingerprint(): string {
  return schemaFingerprintFor(ALL_ITEMS);
}

/**
 * D-11's mechanism. Returns a NEW `QuizAnswers` with every key removed whose corresponding item in
 * `ALL_ITEMS` is a question with `type === "file_multi"`. Type-driven off `item.type`, never a
 * hardcoded question-ID literal (SCH-02's no-question-ID-literals discipline) — a dead GCS staging
 * token or file reference must never survive into a resumed submission, and keying this off the
 * type rather than an ID list means a future `file_multi` question is covered automatically.
 */
export function stripFileTokens(answers: QuizAnswers): QuizAnswers {
  const fileQuestionIds = new Set(
    ALL_ITEMS.filter((item) => isQuestion(item) && item.type === "file_multi").map((item) => item.id)
  );
  const result: QuizAnswers = {};
  for (const [id, value] of Object.entries(answers ?? {})) {
    if (!fileQuestionIds.has(id)) result[id] = value;
  }
  return result;
}

/**
 * Persists a draft. No-op, silently, when storage is unavailable (D-01) — a quota exception or a
 * blocked store on a shared device must never surface to the patient. `answers` is stripped of any
 * `file_multi` value before serialization (D-11, defence at write time). Never persists `score`,
 * `scoreBracket`, `startTime`, `consentChecked`, `patientInfoShowErrors`, `submissionError`, or
 * `showTestMode` — `QuizDraftInput` is what enforces this at the type level; do not widen it to let
 * a caller pass those back in.
 */
export function writeDraft(draft: QuizDraftInput, fingerprint: string = currentSchemaFingerprint()): void {
  if (!isStorageAvailable()) return;
  try {
    const toStore: QuizDraft = {
      ...draft,
      answers: stripFileTokens(draft.answers),
      schemaFingerprint: fingerprint,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // A quota exception or a mid-write storage failure on a shared device must never reach the
    // patient (D-01). Swallow without logging — the caught error could reference the draft.
  }
}

/**
 * Reads back a draft, collapsing EVERY failure reason to the same `null`: storage unavailable,
 * missing key, `JSON.parse` throw, a non-object parse result, a `schemaFingerprint` mismatch, a
 * non-numeric or expired `savedAt`, or missing/empty `answers`. This collapse is a REQUIREMENT,
 * not a convenience — 04.2-UI-SPEC.md § "Absent State" requires the D-01 (storage unavailable)
 * path and the "no draft exists" path to be indistinguishable to the caller, ideally the same
 * branch, so the resume offer can never be shown in a state that reveals *why* it isn't showing.
 *
 * On a fingerprint mismatch and on expiry, `clearDraft()` is called before returning `null` (active
 * cleanup, per D-05) so a permanently-stale draft never lingers on a shared device. Before
 * returning a valid draft, `stripFileTokens` is applied a second time to its `answers` — defence in
 * depth against a hand-edited draft (e.g. a DevTools edit re-adding a file-upload answer value), so
 * a tampered file-token entry can never re-enter React state (D-11).
 */
export function readDraft(fingerprint: string = currentSchemaFingerprint()): QuizDraft | null {
  if (!isStorageAvailable()) return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    // Read failed after the availability canary already succeeded (rare, but storage state can
    // change between calls). Treat exactly like "no draft found."
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt JSON — never throw outward, just report "no draft."
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const draft = parsed as Partial<QuizDraft>;

  if (draft.schemaFingerprint !== fingerprint) {
    clearDraft(); // stale shape — actively remove so it doesn't linger (Finding 2)
    return null;
  }

  if (typeof draft.savedAt !== "number" || Number.isNaN(draft.savedAt)) return null;

  if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
    clearDraft(); // D-05 active cleanup, not passive ignore
    return null;
  }

  if (!draft.answers || typeof draft.answers !== "object" || Object.keys(draft.answers).length === 0) {
    return null; // D-07 defence in depth — an empty-answers draft is indistinguishable from none
  }

  return {
    schemaFingerprint: draft.schemaFingerprint,
    savedAt: draft.savedAt,
    step: draft.step as QuizDraft["step"],
    patientState: draft.patientState ?? null,
    patientInfo: draft.patientInfo as QuizDraftPatientInfo,
    symptomProfileId: draft.symptomProfileId ?? null,
    currentPartIndex: typeof draft.currentPartIndex === "number" ? draft.currentPartIndex : 0,
    answers: stripFileTokens(draft.answers as QuizAnswers), // D-11 defence in depth, on read too
  };
}

/**
 * Clears the persisted draft. No-op, silently, when storage is unavailable; never throws. Called
 * both explicitly (D-08's "Start over" control, clear-on-successful-submit) and internally by
 * `readDraft` on a stale-fingerprint or expired draft.
 */
export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to do if removal itself fails — the draft is already unreadable to the patient in
    // every code path that matters, and there is nothing safe to log.
  }
}
