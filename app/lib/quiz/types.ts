/**
 * Quiz types and interfaces
 */

export interface QuizQuestion {
  id: string;
  category: string;
  text: string;
  order: number;
}

export interface QuizCategory {
  name: string;
  questions: QuizQuestion[];
}

export interface QuizResponse {
  questionId: string;
  value: number; // 0-3 severity
}

export interface QuizSubmission {
  email: string;
  symptom_profile_id: string;
  quiz_score: number;
  quiz_region: string;
  severity_level: "minimal" | "mild" | "moderate" | "severe";
  quiz_date?: string;
  quiz_responses?: number[];
  customer_name?: string;
  completion_time?: number;
}

export interface QuizConfig {
  useMetaobjects?: boolean;
  shopUrl?: string;
  googleSheetsWebAppUrl?: string;
}



