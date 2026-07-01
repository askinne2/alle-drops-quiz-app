import { type QuizQuestion } from "./types";

// ─────────────────────────────────────────────
// PART 1 — Symptom Checklist (checkbox_multi)
// Scoring: 1 point per checked box
// ─────────────────────────────────────────────

export const PART1_SYMPTOM_CHECKLIST: QuizQuestion[] = [
  {
    id: "symptoms_nasal",
    type: "checkbox_multi",
    part: 1,
    text: "Do you experience any of the following nasal symptoms? (Check all that apply)",
    options: [
      { value: "sneezing", label: "Sneezing (especially in episodes)" },
      { value: "runny_nose", label: "Runny nose or nasal drainage" },
      { value: "nasal_congestion", label: "Nasal congestion or stuffiness" },
      { value: "itchy_nose", label: "Itchy nose" },
      { value: "postnasal_drip", label: "Postnasal drip" },
      { value: "none", label: "None of the above" },
    ],
    excludeFromScore: ["none"],
    order: 10,
  },
  {
    id: "symptoms_eye",
    type: "checkbox_multi",
    part: 1,
    text: "Do you experience any of the following eye symptoms? (Check all that apply)",
    options: [
      { value: "itchy_eyes", label: "Itchy eyes" },
      { value: "red_eyes", label: "Red or bloodshot eyes" },
      { value: "watery_eyes", label: "Watery eyes" },
      { value: "swollen_eyelids", label: "Swollen eyelids" },
      { value: "none", label: "None of the above" },
    ],
    excludeFromScore: ["none"],
    order: 11,
  },
  {
    id: "symptoms_sinus",
    type: "checkbox_multi",
    part: 1,
    text: "Do you experience any of the following sinus symptoms? (Check all that apply)",
    options: [
      { value: "facial_pressure", label: "Facial pressure or pain" },
      { value: "headaches", label: "Headaches" },
      { value: "smell_loss", label: "Reduced sense of smell" },
      { value: "none", label: "None of the above" },
    ],
    excludeFromScore: ["none"],
    order: 12,
  },
];

// ─────────────────────────────────────────────
// PART 2 — Symptom Timing & Triggers (radio_multi)
// Scoring: 1 point per selected (except exclusions)
// ─────────────────────────────────────────────

export const PART2_TIMING_TRIGGERS: QuizQuestion[] = [
  {
    id: "timing_season",
    type: "radio_multi",
    part: 2,
    text: "When do your symptoms occur? (Select all that apply)",
    options: [
      { value: "spring", label: "Spring (tree pollen season)" },
      { value: "summer", label: "Summer (grass pollen season)" },
      { value: "fall", label: "Fall (ragweed season)" },
      { value: "year_round", label: "Year-round" },
      { value: "certain_times", label: "Only at certain times of year" },
      { value: "only_rarely", label: "Only rarely do I have symptoms" },
    ],
    excludeFromScore: ["only_rarely"],
    order: 20,
  },
  {
    id: "timing_triggers",
    type: "radio_multi",
    part: 2,
    text: "Do your symptoms worsen with exposure to: (Select all that apply)",
    options: [
      { value: "pets", label: "Cats, dogs, or other furry pets" },
      { value: "dust", label: "Dust or dusty environments" },
      { value: "mold", label: "Mold or damp areas" },
      { value: "grass", label: "Cut grass or outdoor plants" },
      { value: "environments", label: "Specific indoor or outdoor environments" },
      { value: "none", label: "None of the above" },
    ],
    excludeFromScore: ["none"],
    order: 21,
  },
];

// ─────────────────────────────────────────────
// PART 3 — Symptom Severity (severity_0_3)
// Scoring: None(0) Mild(1) Moderate(2) Severe(3)
// ─────────────────────────────────────────────

export const PART3_SEVERITY: QuizQuestion[] = [
  {
    id: "severity_nasal_congestion",
    type: "severity_0_3",
    part: 3,
    text: "Nasal congestion",
    subtitle: "Rate your symptoms over the past week",
    order: 30,
  },
  {
    id: "severity_sneezing",
    type: "severity_0_3",
    part: 3,
    text: "Sneezing",
    order: 31,
  },
  {
    id: "severity_runny_nose",
    type: "severity_0_3",
    part: 3,
    text: "Runny nose",
    order: 32,
  },
  {
    id: "severity_nasal_itching",
    type: "severity_0_3",
    part: 3,
    text: "Nasal itching",
    order: 33,
  },
  {
    id: "severity_eye_itching",
    type: "severity_0_3",
    part: 3,
    text: "Eye itching/redness",
    order: 34,
  },
];

// ─────────────────────────────────────────────
// PART 4 — Daily Life Impact (frequency_0_4 + bother_0_4)
// ─────────────────────────────────────────────

export const PART4_IMPACT: QuizQuestion[] = [
  {
    id: "impact_sleep",
    type: "frequency_0_4",
    part: 4,
    text: "How often do your nasal or eye symptoms interfere with your sleep quality?",
    order: 40,
  },
  {
    id: "impact_daily",
    type: "frequency_0_4",
    part: 4,
    text: "How often do they interfere with daily activities (work, school, exercise)?",
    order: 41,
  },
  {
    id: "impact_concentrate",
    type: "frequency_0_4",
    part: 4,
    text: "How often do they interfere with your ability to concentrate?",
    order: 42,
  },
  {
    id: "impact_social",
    type: "frequency_0_4",
    part: 4,
    text: "How often do they interfere with social activities or outdoor enjoyment?",
    order: 43,
  },
  {
    id: "bother_overall",
    type: "bother_0_4",
    part: 4,
    text: "How bothersome are your allergy symptoms overall?",
    order: 44,
  },
];

// ─────────────────────────────────────────────
// PART 5 — Current Treatment (yesno + control_0_3)
// ─────────────────────────────────────────────

export const PART5_TREATMENT: QuizQuestion[] = [
  {
    id: "taking_meds",
    type: "yesno",
    part: 5,
    text: "Are you currently taking any allergy medications?",
    order: 50,
  },
  {
    id: "med_list",
    type: "text_input",
    part: 5,
    text: "Please list your current allergy medications and dosages (required):",
    order: 51,
  },
  {
    id: "med_control",
    type: "control_0_3",
    part: 5,
    text: "How well controlled are your symptoms with current treatment?",
    options: [
      { value: "completely", label: "Completely controlled", score: 0 },
      { value: "well", label: "Well controlled", score: 0 },
      { value: "somewhat", label: "Somewhat controlled", score: 1 },
      { value: "poorly", label: "Poorly controlled", score: 2 },
      { value: "not_at_all", label: "Not controlled at all", score: 3 },
    ],
    order: 52,
  },
];

// ─────────────────────────────────────────────
// PART 6 — Medical History (checkbox_multi, no score)
// Displayed only if patient chooses to proceed after 7+ result
// ─────────────────────────────────────────────

export const PART6_MEDICAL_HISTORY: QuizQuestion[] = [
  {
    id: "history_personal",
    type: "checkbox_multi",
    part: 6,
    text: "Do you have a personal history of any of the following? (Check all that apply)",
    options: [
      { value: "asthma", label: "Asthma" },
      { value: "eczema", label: "Eczema or atopic dermatitis" },
      { value: "food_allergies", label: "Food allergies" },
      { value: "positive_allergy_test", label: "Previous positive allergy testing" },
      { value: "ed_visits", label: "Previous Emergency Dept visits for allergic reactions" },
    ],
    order: 60,
  },
  {
    id: "history_family",
    type: "checkbox_multi",
    part: 6,
    text: "Do you have a family history of any of the following? (Check all that apply)",
    options: [
      { value: "rhinitis", label: "Allergic rhinitis (hay fever)" },
      { value: "asthma", label: "Asthma" },
      { value: "eczema", label: "Eczema or other allergic conditions" },
    ],
    order: 61,
  },
];

// All questions for parts 1-5 (used in scoring and main flow)
export const ALL_SCORED_QUESTIONS: QuizQuestion[] = [
  ...PART1_SYMPTOM_CHECKLIST,
  ...PART2_TIMING_TRIGGERS,
  ...PART3_SEVERITY,
  ...PART4_IMPACT,
  ...PART5_TREATMENT,
];

// Helper: get question by id
export function getQuestionById(id: string): QuizQuestion | undefined {
  return [...ALL_SCORED_QUESTIONS, ...PART6_MEDICAL_HISTORY].find((q) => q.id === id);
}

/** Ordered parts 1–5 for the main quiz flow */
export const QUIZ_PARTS: QuizQuestion[][] = [
  PART1_SYMPTOM_CHECKLIST,
  PART2_TIMING_TRIGGERS,
  PART3_SEVERITY,
  PART4_IMPACT,
  PART5_TREATMENT,
];
