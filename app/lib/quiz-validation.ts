/**
 * Quiz data validation
 * Migrated from Cloudflare Worker validateRequestData()
 */

export interface QuizSubmissionData {
  email: string;
  symptom_profile_id: string;
  quiz_score: number;
  quiz_region: string;
  severity_level: "minimal" | "mild" | "moderate" | "severe";
  quiz_date?: string;
  quiz_responses?: number[];
  customer_name?: string;
  completion_time?: number;
  timing_seasonal?: string;
  timing_duration?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate quiz submission data
 * Migrated from Cloudflare Worker validateRequestData()
 */
export function validateQuizData(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid data format" };
  }

  const quizData = data as Partial<QuizSubmissionData>;

  // Validate email
  if (!quizData.email || !isValidEmail(quizData.email)) {
    return { valid: false, error: "Valid email is required" };
  }

  // Validate symptom_profile_id
  if (!quizData.symptom_profile_id) {
    return { valid: false, error: "symptom_profile_id is required" };
  }

  // Validate quiz_score
  if (typeof quizData.quiz_score !== "number") {
    return { valid: false, error: "quiz_score must be a number" };
  }

  // Validate quiz_region
  if (!quizData.quiz_region) {
    return { valid: false, error: "quiz_region is required" };
  }

  // Validate severity_level
  if (!quizData.severity_level) {
    return { valid: false, error: "severity_level is required" };
  }

  const validSeverityLevels = ["minimal", "mild", "moderate", "severe"];
  if (!validSeverityLevels.includes(quizData.severity_level)) {
    return { valid: false, error: "severity_level must be one of: minimal, mild, moderate, severe" };
  }

  return { valid: true };
}

