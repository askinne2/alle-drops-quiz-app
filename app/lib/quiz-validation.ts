/**
 * Quiz data validation
 *
 * SECURITY / HIPAA: All identity fields (name, dob, email, phone) and all
 * health information (score, bracket, answers, history) are PHI. They are
 * stored in Cloud SQL Postgres only — see app/lib/submissions.ts.
 *
 * NEVER write any of these fields to Shopify customer metafields, customer
 * record fields, or any Shopify Admin API payload. Shopify holds only
 * non-PHI flags (last_completed_at, quiz_count) — see app/lib/shopify/metafields.ts.
 *
 * `answers.testing_files` (plan 04-17) holds opaque upload tokens, not file content — but a
 * token is client-supplied and gets interpolated into a GCS object-lookup prefix during
 * promotion (api.quiz.submit.tsx step 3.5). It is validated here, in the same place every other
 * payload shape is validated, as an array of at most MAX_FILES UUID-shaped strings BEFORE any
 * storage lookup is ever attempted.
 */
import { MAX_FILES } from "./storage/upload-validation";

// Accepts any RFC 4122-shaped UUID (the app only ever generates v4 via crypto.randomUUID(), but
// this validator's job is shape-checking a client-supplied token, not asserting the generator's
// version bits).
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type QuizState = "tennessee" | "texas";
export type ScoreBracket = "0-2" | "3-6" | "7+";

export interface QuizSubmissionData {
  state: QuizState;
  name: string;
  dob: string; // ISO date (YYYY-MM-DD)
  email: string;
  phone: string;
  symptom_profile_id: string;
  quiz_score: number;
  score_bracket: ScoreBracket;
  quiz_date?: string;
  answers: Record<string, unknown>;
  completion_time?: number;
  consent_version?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function isIsoDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00");
  return !Number.isNaN(d.getTime());
}

/** Age in full years at reference date (local calendar). */
function ageFromDob(isoDob: string, ref: Date = new Date()): number {
  const [y, m, day] = isoDob.split("-").map(Number);
  const birth = new Date(y, m - 1, day);
  let age = ref.getFullYear() - birth.getFullYear();
  const md = ref.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

function digitsOnlyPhone(s: string): string {
  return s.replace(/\D/g, "");
}

export function validateQuizData(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid data format" };
  }

  const quizData = data as Partial<QuizSubmissionData>;

  if (!quizData.state || (quizData.state !== "tennessee" && quizData.state !== "texas")) {
    return { valid: false, error: "state must be tennessee or texas" };
  }

  if (!quizData.name || typeof quizData.name !== "string" || !quizData.name.trim()) {
    return { valid: false, error: "name is required" };
  }

  if (!quizData.dob || typeof quizData.dob !== "string") {
    return { valid: false, error: "dob is required" };
  }
  if (!isIsoDateString(quizData.dob)) {
    return { valid: false, error: "dob must be a valid ISO date (YYYY-MM-DD)" };
  }
  if (ageFromDob(quizData.dob) < 18) {
    return { valid: false, error: "You must be 18 or older to continue" };
  }

  if (!quizData.email || !isValidEmail(quizData.email)) {
    return { valid: false, error: "Valid email is required" };
  }

  if (!quizData.phone || typeof quizData.phone !== "string") {
    return { valid: false, error: "phone is required" };
  }
  const phoneDigits = digitsOnlyPhone(quizData.phone);
  if (phoneDigits.length < 10) {
    return { valid: false, error: "phone must contain at least 10 digits" };
  }

  if (!quizData.symptom_profile_id) {
    return { valid: false, error: "symptom_profile_id is required" };
  }

  if (typeof quizData.quiz_score !== "number" || Number.isNaN(quizData.quiz_score)) {
    return { valid: false, error: "quiz_score must be a number" };
  }

  const brackets: ScoreBracket[] = ["0-2", "3-6", "7+"];
  if (!quizData.score_bracket || !brackets.includes(quizData.score_bracket as ScoreBracket)) {
    return { valid: false, error: "score_bracket must be one of: 0-2, 3-6, 7+" };
  }

  if (!quizData.answers || typeof quizData.answers !== "object" || Array.isArray(quizData.answers)) {
    return { valid: false, error: "answers must be an object" };
  }

  const testingFiles = (quizData.answers as Record<string, unknown>).testing_files;
  if (testingFiles !== undefined) {
    const isValidTokenArray =
      Array.isArray(testingFiles) &&
      testingFiles.length <= MAX_FILES &&
      testingFiles.every((t) => typeof t === "string" && UUID_SHAPE.test(t));
    if (!isValidTokenArray) {
      return {
        valid: false,
        error: `answers.testing_files must be an array of at most ${MAX_FILES} UUID-shaped upload tokens`,
      };
    }
  }

  return { valid: true };
}
