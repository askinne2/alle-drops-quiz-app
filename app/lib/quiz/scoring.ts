import { type QuizAnswers, type QuizQuestion } from "./types";

// Score bracket thresholds, revised 2026-08-13 by the AOD medical director (William Miller). See
// .planning/phases/05.2-clinical-bracket-revision/05.2-SOURCE-william-2026-08-13.md for the
// verbatim source of this change.
export const SCORE_BRACKETS = {
  LOW: { min: 0, max: 2 }, // "mild and well-controlled"
  MID: { min: 3, max: 8 }, // "may benefit from seeing an allergist prior to starting treatment"
  HIGH: { min: 9, max: Infinity }, // "would likely benefit from SLIT"
} as const;

export type ScoreBracket = "0-2" | "3-8" | "9+";

/**
 * Calculate score for a single question answer.
 *
 * checkbox_multi / radio_multi:
 *   - answer is string[] of selected option values
 *   - 1 point per selected value, EXCEPT values in question.excludeFromScore
 *
 * severity_0_3:
 *   - answer is number 0-3 (direct point value)
 *
 * frequency_0_4 / bother_0_4:
 *   - answer is number 0-4 (direct point value)
 *
 * control_0_3:
 *   - answer is string matching an option value
 *   - score is looked up from question.options[].score
 *
 * yesno / text_input:
 *   - no score contribution
 */
export function scoreQuestion(
  question: QuizQuestion,
  answer: string | string[] | number | undefined
): number {
  if (answer === undefined || answer === null) return 0;

  switch (question.type) {
    case "checkbox_multi":
    case "radio_multi": {
      if (!Array.isArray(answer)) return 0;
      const excluded = new Set(question.excludeFromScore || []);
      return answer.filter((v) => !excluded.has(v)).length;
    }

    case "severity_0_3":
    case "frequency_0_4":
    case "bother_0_4": {
      if (typeof answer !== "number") return 0;
      return answer;
    }

    case "control_0_3": {
      if (typeof answer !== "string") return 0;
      const opt = question.options?.find((o) => o.value === answer);
      return opt?.score ?? 0;
    }

    case "yesno":
    case "text_input":
      return 0;

    default:
      return 0;
  }
}

/**
 * Calculate total score from all answers across all scored questions.
 */
export function calculateTotalScore(questions: QuizQuestion[], answers: QuizAnswers): number {
  return questions.reduce((total, question) => {
    const answer = answers[question.id];
    return total + scoreQuestion(question, answer);
  }, 0);
}

/**
 * Theoretical maximum a single question can contribute, independent of any answer. Mirrors
 * scoreQuestion's switch member for member — every new QuestionType must be added to BOTH
 * switches, or getMaxScore silently omits it and understates the ceiling (05-RESEARCH.md
 * Pitfall 1). scoreWeight is intentionally NOT applied here: it is declared on QuizQuestion but
 * scoreQuestion never reads it (zero references outside its own declaration in types.ts), so
 * weighting it into the ceiling would make the derived max unreachable by any real answer
 * (05-RESEARCH.md Pitfall 2).
 */
export function getQuestionMaxScore(question: QuizQuestion): number {
  switch (question.type) {
    case "checkbox_multi":
    case "radio_multi": {
      const excluded = new Set(question.excludeFromScore || []);
      return (question.options || []).filter((o) => !excluded.has(o.value)).length;
    }

    case "severity_0_3":
      return 3;

    case "frequency_0_4":
    case "bother_0_4":
      return 4;

    case "control_0_3": {
      const scores = (question.options || []).map((o) => o.score ?? 0);
      return scores.length ? Math.max(...scores) : 0;
    }

    case "yesno":
    case "text_input":
    case "radio_single":
    case "text_input_short":
    case "file_multi":
      return 0;

    default:
      return 0;
  }
}

/**
 * Theoretical maximum total across a question list — the SCORE-02 ceiling.
 */
export function getMaxScore(questions: QuizQuestion[]): number {
  return questions.reduce((total, question) => total + getQuestionMaxScore(question), 0);
}

/**
 * Determine score bracket from total score.
 */
export function getScoreBracket(score: number): ScoreBracket {
  if (score <= SCORE_BRACKETS.LOW.max) return "0-2";
  if (score <= SCORE_BRACKETS.MID.max) return "3-8";
  return "9+";
}

/**
 * Generate unique symptom profile ID.
 */
export function generateSymptomProfileId(): string {
  return `AOD_${Date.now()}`;
}
