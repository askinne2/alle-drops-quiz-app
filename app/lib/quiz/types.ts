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
  | "control_0_3"; // Medication control: Completely(0)/Well(0)/Somewhat(1)/Poorly(2)/Not at all(3)

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  subtitle?: string;
  options?: QuizOption[]; // For checkbox_multi, radio_multi
  excludeFromScore?: string[]; // Option values that score 0 (e.g. "none_of_above", "only_rarely")
  order: number;
  part: number; // Which part of the questionnaire (1-6)
  scoreWeight?: number; // Default 1; override if needed
}

export interface QuizOption {
  value: string;
  label: string;
  score?: number; // Override default scoring if needed
}

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
  score_bracket: "0-2" | "3-6" | "7+";
  quiz_date: string;
  answers: QuizAnswers; // Full answers stored in Google Sheets
  completion_time?: number;
  // Medical history (Part 6) — stored in Google Sheets only
  personal_history?: string[];
  family_history?: string[];
}

export interface QuizConfig {
  useMetaobjects?: boolean;
  shopUrl?: string;
  googleSheetsWebAppUrl?: string;
}
