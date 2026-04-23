import { type QuizAnswers, type QuizQuestion } from "./types";

// Score bracket thresholds (from AOD medical director)
export const SCORE_BRACKETS = {
  LOW: { min: 0, max: 2 }, // "mild and well-controlled"
  MID: { min: 3, max: 6 }, // "may benefit from seeing an allergist"
  HIGH: { min: 7, max: Infinity }, // "would likely benefit from SLIT"
} as const;

export type ScoreBracket = "0-2" | "3-6" | "7+";

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
 * Determine score bracket from total score.
 */
export function getScoreBracket(score: number): ScoreBracket {
  if (score <= SCORE_BRACKETS.LOW.max) return "0-2";
  if (score <= SCORE_BRACKETS.MID.max) return "3-6";
  return "7+";
}

/**
 * Generate unique symptom profile ID.
 */
export function generateSymptomProfileId(): string {
  return `AOD_${Date.now()}`;
}
