/**
 * Quiz types — clinical questionnaire (AOD)
 */

// Question types in the new clinical quiz
export type QuestionType =
  | "checkbox_multi" // Check all that apply — each checked = 1 point
  | "radio_multi" // Select one or more from list — each selected = 1 point (except exclusions)
  | "severity_0_3" // None(0) / Mild(1) / Moderate(2) / Severe(3)
  | "frequency_0_4" // Not at all(0) / Rarely(1) / Sometimes(2) / Often(3) / Very often(4)
  | "bother_0_4" // Not bothersome(0) through Extremely bothersome(4)
  | "yesno" // Yes / No — used for medication question, no score
  | "text_input" // Free text — used for medication list, no score
  | "control_0_3" // Medication control: Completely(0)/Well(0)/Somewhat(1)/Poorly(2)/Not at all(3)
  | "radio_single" // Single required choice from custom-labeled options, no score. Renders
  // identically to control_0_3 but is named separately so app/lib/format.ts's ANSWER_LABELS, the
  // clinical PDF, and the admin modal read correctly — the same granular-naming precedent
  // severity_0_3 / frequency_0_4 / bother_0_4 already follow.
  | "text_input_short" // Single-line <input type="text"> variant of text_input, no score.
  | "file_multi"; // Answer shape string[] of opaque upload-reference tokens returned by
  // POST /api/quiz/upload, never raw file blobs, no score. Part 7 is structurally outside
  // ALL_SCORED_QUESTIONS; its only consumer (testing_files) arrives in the blocker-gated upload
  // wave.

export interface QuizQuestion {
  kind: "question"; // Discriminant for the QuizItem union (D-09). Required, not optional — an
  // optional discriminant would weaken the compiler's ability to narrow QuizItem to QuizQuestion.
  id: string;
  type: QuestionType;
  text: string;
  subtitle?: string;
  options?: QuizOption[]; // For checkbox_multi, radio_multi
  excludeFromScore?: string[]; // Option values that score 0 (e.g. "none_of_above", "only_rarely")
  order: number;
  part: number; // Which part of the questionnaire (1-6)
  scoreWeight?: number; // Default 1; override if needed
  required?: boolean; // Defaults to true (D-05) — omission is the common case, so a question added
  // in Phase 3/4 that forgets this flag stays required, not silently optional.
  showIf?: ShowIfCondition; // Declarative conditional visibility (D-01, D-02) — no function escape
  // hatch. Evaluated by the shared evaluator, never by ad hoc renderer logic.
}

export interface QuizOption {
  value: string;
  label: string;
  score?: number; // Override default scoring if needed
  exclusive?: boolean; // Selecting this option deselects every other option on the same question
  // (D-13). Independent of excludeFromScore — timing_season's only_rarely is excluded from score
  // but is deliberately NOT exclusive (D-14): a patient can be rarely symptomatic and symptomatic
  // in spring. Do not derive this flag from excludeFromScore anywhere.
}

// Declarative conditional-visibility predicate (D-01). A three-member union rather than a single
// interface with three optional fields, so it is syntactically impossible to write two operators
// on one condition. Exactly these three operators, each with a named Phase 3/4 consumer (D-02):
// equals — today's taking_meds === "yes"; Phase 3 HIST-04 (PCP yes/no); Phase 4 TEST-02.
// includes — a specific option selected within a multi-select.
// isAnswered — Phase 3 HIST-02, "checking any box including none of the above reveals the
//   medications field" — a non-empty test, not an equality test.
// No notEquals, no allOf/anyOf — nothing through Phase 4 needs them.
export type ShowIfCondition =
  | { questionId: string; equals: string }
  | { questionId: string; includes: string }
  | { questionId: string; isAnswered: true };

// A static, non-interactive content block (D-09). Discriminated-union member, not a QuestionType —
// the compiler, not a reviewer, enforces that an info block cannot carry `required`, cannot be
// read for an answer, and cannot enter ALL_SCORED_QUESTIONS (which stays typed QuizQuestion[]).
// Content is structured strings rendered as React children (D-10) — escaping is automatic and the
// injection surface is zero. NO markdown, NO HTML, and NO sanitizer or renderer dependency is
// permitted here: Phase 1 closed a reflected XSS on this exact page (jsonForScript + per-response
// nonce CSP); re-admitting an HTML sink on this surface would need its own security review.
// MUST NOT declare `required`, not even as `required?: false` — info blocks collect no answer.
export interface QuizInfoBlock {
  kind: "info";
  id: string;
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
  order: number;
  part: number;
  showIf?: ShowIfCondition;
}

// The full item union a quiz part can contain (D-09). Part arrays widen to QuizItem[][] so Phase 3
// can place an info block inside a part without a further type change.
export type QuizItem = QuizQuestion | QuizInfoBlock;

export interface QuizCategory {
  name: string;
  part: number;
  questions: QuizQuestion[];
}

// Flat map of questionId → answer value(s)
// checkbox_multi / radio_multi: string[] of selected option values
// severity_0_3 / frequency_0_4 / bother_0_4: number; control_0_3: string (option value)
// yesno: "yes" | "no"
// text_input: string
export type QuizAnswers = Record<string, string | string[] | number>;

export interface QuizSubmission {
  state: "tennessee" | "texas";
  name: string;
  dob: string; // ISO date string — stored in Google Sheets ONLY, never Shopify
  email: string;
  phone: string;
  symptom_profile_id: string;
  quiz_score: number;
  score_bracket: "0-2" | "3-8" | "9+";
  quiz_date: string;
  answers: QuizAnswers; // Full answers stored in Google Sheets
  completion_time?: number;
}

export interface QuizConfig {
  useMetaobjects?: boolean;
  shopUrl?: string;
  googleSheetsWebAppUrl?: string;
}
