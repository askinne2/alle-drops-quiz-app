import { type QuizAnswers, type QuizItem, type QuizOption, type QuizQuestion, type ShowIfCondition } from "./types";
import { getQuestionById } from "./questions";

/**
 * The pure evaluator module every question-ID literal in `QuizPartRenderer.tsx` is replaced
 * by (SCH-02). Every decision the renderer used to make from a hardcoded literal — which
 * options are exclusive, which questions are visible, which answers leave the browser — now
 * lives here as a pure function taking explicit arguments, so it is directly testable under
 * vitest's `node` environment without a DOM test dependency (DIR-01).
 *
 * Must stay in sync with `./types.ts`'s `ShowIfCondition` union: if a fourth operator is ever
 * added there, `evaluateShowIf` below needs a matching branch or it silently falls through to
 * its safe default.
 *
 * Named exports only, matching `navigation.ts` / `redirects.ts`. Nothing in this directory
 * throws (see `navigation.ts:78`) — invalid input degrades to a safe default everywhere below.
 * No React import, no read of any browser global, no reach for component state; every input is
 * an argument.
 */

/**
 * Type predicate narrowing a `QuizItem` to a `QuizQuestion` (D-09).
 *
 * This is a NEW pattern for this codebase — there is no established discriminated-union
 * precedent here today. The only related precedent, `isSafeRelativePath` in `navigation.ts`, is
 * a single `x is Y` narrow on a primitive, not a union member. Do not treat this as "following
 * an established pattern"; it is the first of its kind in `app/lib/quiz/`.
 */
export function isQuestion(item: QuizItem): item is QuizQuestion {
  return item.kind === "question";
}

/**
 * Normalizes an answer value to the array shape checkbox_multi / radio_multi questions use.
 * Replaces the renderer's local `getMultiAnswer` helper, which moves here so the renderer stops
 * owning it. Anything that is not already an array (undefined, a string, a number) becomes `[]`.
 */
export function selectedValues(value: string | string[] | number | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

/**
 * The single shared "has this question been answered" predicate (D-07), consumed by both the
 * required check and the `showIf` `isAnswered` operator so they can never drift — a question
 * that disables Next and a question that would reveal a dependent field always agree.
 *
 * - checkbox_multi / radio_multi: a non-empty array. `[]` does NOT count (D-06 — a deliberate
 *   behavior change from today's `isPartComplete`, which only checked `Array.isArray`).
 * - text_input: a non-empty string after trimming (D-08 — whitespace-only stays blocked,
 *   matching the two existing med_list tests).
 * - severity_0_3 / frequency_0_4 / bother_0_4: any number. Zero is a meaningful answer — "None"
 *   severity is still an answer, and a test asserting otherwise would break Part 3.
 * - yesno: exactly the string "yes" or "no".
 * - control_0_3: a non-empty string.
 * - any other/unknown type: `false` (safe default, matches `scoring.ts`'s `default: return 0`).
 */
export function isAnswered(
  question: QuizQuestion,
  value: string | string[] | number | undefined
): boolean {
  switch (question.type) {
    case "checkbox_multi":
    case "radio_multi":
      return Array.isArray(value) && value.length > 0;
    case "text_input":
      return typeof value === "string" && value.trim().length > 0;
    case "severity_0_3":
    case "frequency_0_4":
    case "bother_0_4":
      return typeof value === "number";
    case "yesno":
      return value === "yes" || value === "no";
    case "control_0_3":
      return typeof value === "string" && value.length > 0;
    default:
      return false;
  }
}

/**
 * Evaluates a `showIf` condition against the CURRENT (unfiltered, raw React state) answers.
 *
 * ALWAYS call this with raw `answers` state — NEVER with `visibleAnswers()` output. Both take an
 * answers-shaped argument, so the type system cannot separate them (RESEARCH.md Pitfall 2);
 * mixing them breaks chained conditionals silently. `visibleAnswers` is the boundary filter for
 * the two D-03 call sites (immediately before `calculateTotalScore` and before the
 * `POST /api/quiz/submit` payload); this function is for render-time visibility decisions only.
 *
 * D-04: a `condition.questionId` that does not resolve to a real question fails OPEN — the item
 * renders. Hiding would silently skip a clinical question AND silently skip its required check.
 * This inverts Phase 1's navigation fail-closed rule deliberately: over-collecting is
 * recoverable, silent omission in a clinical record is not. A dedicated reference-integrity test
 * (schema.test.ts, appended in Task 3) asserts every real `showIf.questionId` resolves, so this
 * branch should be unreachable in production — it exists as a safety net, not a designed path.
 *
 * Never throws: a malformed condition (null, a number, a plain object with no recognized
 * operator field) falls through to the final `return true`, and a missing/undefined `answers`
 * object is treated as empty rather than dereferenced.
 */
export function evaluateShowIf(condition: ShowIfCondition | undefined, answers: QuizAnswers): boolean {
  if (!condition || typeof condition !== "object") return true; // no condition = always visible

  const questionId = (condition as Partial<ShowIfCondition>).questionId;
  const target = typeof questionId === "string" ? getQuestionById(questionId) : undefined;
  if (!target) return true; // D-04 — dangling (or malformed) reference fails OPEN, not closed

  const value = answers ? answers[questionId as string] : undefined;

  if ("equals" in condition) {
    return value === condition.equals;
  }
  if ("includes" in condition) {
    return Array.isArray(value) && value.includes(condition.includes);
  }
  if ("isAnswered" in condition && condition.isAnswered) {
    return isAnswered(target, value);
  }
  return true; // malformed condition with no recognized operator — safe default
}

/**
 * Filters a list of items down to the ones currently visible per `evaluateShowIf`. Returns a new
 * array; never mutates `items`. Info blocks compose with `showIf` exactly like questions do
 * (D-12) — they are not decoration, so no special-casing is needed here.
 */
export function visibleItems(items: QuizItem[], answers: QuizAnswers): QuizItem[] {
  return items.filter((item) => evaluateShowIf(item.showIf, answers));
}

/**
 * Selects the full, unfiltered item list — questions AND info blocks — for the part at `index`.
 *
 * UAT defect fix: `QuizContainer.tsx` used to narrow `QUIZ_PARTS[currentPartIndex]` down to
 * `QuizQuestion[]` with a `item.kind === "question"` filter before handing the result to
 * `QuizPartRenderer`. That stripped every `QuizInfoBlock` before it ever reached the renderer —
 * `QuizPartRenderer` and `isPartComplete` both already accept `QuizItem[]` and already branch
 * correctly on `item.kind === "info"` (see `QuizPartRenderer.tsx`'s `InfoBlockCard`), so the
 * question-only filter was the single broken link, not a missing feature downstream.
 *
 * `index` out of range (including a negative index or one past the end) returns `[]` rather than
 * throwing, matching this module's fail-safe convention (nothing in `app/lib/quiz/` throws).
 */
export function itemsForPart(parts: QuizItem[][], index: number): QuizItem[] {
  return parts[index] ?? [];
}

/**
 * The D-03 boundary filter. Returns a NEW `QuizAnswers` containing only the entries that are
 * licensed to leave the browser toward Cloud SQL and the clinical PDF. Call this at exactly the
 * two D-03 sites in `QuizContainer.tsx` — immediately before `calculateTotalScore` and
 * immediately before constructing the `POST /api/quiz/submit` payload — and never during render
 * (see the `evaluateShowIf` doc comment / RESEARCH.md Pitfall 2).
 *
 * An entry is kept when, and only when, it belongs to a currently-visible QUESTION. Everything
 * else is stripped:
 *   - a known question that is currently hidden (D-03's actual purpose — a patient who answers
 *     med_list, goes back, and flips taking_meds to "no" must not send that orphan answer into
 *     the record Dr. Sullivan reads)
 *   - a known info block, regardless of its own visibility (D-11 — info blocks collect no
 *     answer, full stop; nothing in this codebase should ever write one, but this function does
 *     not trust that promise)
 *
 * An answers key that belongs to NO item in `items` at all is passed through UNTOUCHED — this is
 * DIR-02, and it is the single highest-stakes behavior in this module. `visibleAnswers` is
 * sometimes handed an item list that is deliberately Part-6-blind (`ALL_SCORED_QUESTIONS`, used
 * for scoring), and `history_personal` / `history_family` must survive that call unchanged. A
 * keep-known-and-visible whitelist would silently drop them the moment it saw a Part-6-blind
 * list — a clinical record losing data with no error and no failing test. The blacklist form
 * below fails open in the same direction D-04 chose: it can only ever strip something it
 * positively recognizes, never something it doesn't.
 *
 * Does not mutate `answers` — builds and returns a fresh object every call, so a patient who
 * toggles a parent answer back and forth never loses typed text still held in React state (D-03).
 */
export function visibleAnswers(items: QuizItem[], answers: QuizAnswers): QuizAnswers {
  const strippableIds = new Set(
    items
      .filter((item) => !(isQuestion(item) && evaluateShowIf(item.showIf, answers)))
      .map((item) => item.id)
  );
  const result: QuizAnswers = {};
  for (const [id, value] of Object.entries(answers ?? {})) {
    if (!strippableIds.has(id)) result[id] = value;
  }
  return result;
}

/**
 * Reproduces the renderer's `onChange` toggle logic (`QuizPartRenderer.tsx:68-79` pre-refactor)
 * as a pure function. Exclusivity is read off `option.exclusive` ONLY — never derived from
 * `excludeFromScore` (D-14, an independent concept: `timing_season`'s `only_rarely` is excluded
 * from score but deliberately NOT exclusive) and never compared against a value string like
 * `"none"` (D-15 — the option-level flag makes the spelling irrelevant).
 *
 * - Clicking an option whose `exclusive === true`: if it is already selected, the result is `[]`
 *   (D-16 — a checkbox that will not uncheck is surprising and re-adds the special case the
 *   flag was meant to remove); otherwise the result is exactly `[clickedValue]`, clearing
 *   everything else.
 * - Clicking any other option: every currently-selected exclusive value is dropped first, then
 *   `clickedValue` is added or removed depending on whether it was already selected.
 * - A `clickedValue` matching no option in `question.options` falls through to plain toggle
 *   behavior rather than throwing (nothing in this directory throws).
 *
 * Always returns a new array.
 */
export function toggleOption(question: QuizQuestion, current: string[], clickedValue: string): string[] {
  const clickedOption = (question.options ?? []).find((o) => o.value === clickedValue);

  if (clickedOption?.exclusive === true) {
    return current.includes(clickedValue) ? [] : [clickedValue];
  }

  const isExclusive = (value: string): boolean =>
    (question.options ?? []).find((o) => o.value === value)?.exclusive === true;

  const withoutExclusive = current.filter((v) => !isExclusive(v));

  return withoutExclusive.includes(clickedValue)
    ? withoutExclusive.filter((v) => v !== clickedValue)
    : [...withoutExclusive, clickedValue];
}

/**
 * D-13 IS DELIBERATELY GONE. There used to be an `isOptionDisabledByExclusive` helper here that
 * told the renderer to set `disabled` on every non-exclusive option while an exclusive one was
 * selected. UAT (session 33) found the patient-facing consequence: click "None of the above" by
 * mistake and every real answer greys out, with nothing on screen explaining that re-clicking
 * "None" is the way back. `toggleOption` above already drops the exclusive value when a normal
 * option is clicked, so the disable bought nothing and cost the patient the switch.
 *
 * Do not reintroduce it. If exclusivity needs a visual signal, express it in the option's copy or
 * styling — never by making the alternative unclickable.
 */
