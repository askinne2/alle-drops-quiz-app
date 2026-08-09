import { type QuizItem, type QuizQuestion } from "./types";

// ─────────────────────────────────────────────
// PART 1 — Symptom Checklist (checkbox_multi)
// Scoring: 1 point per checked box
// ─────────────────────────────────────────────

export const PART1_SYMPTOM_CHECKLIST: QuizQuestion[] = [
  {
    kind: "question",
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
      // The exclusive flag below reproduces isExclusiveNoneQuestion's hardcode for this ID (D-13).
      // Not derived from excludeFromScore — the two are independent declarations (D-14).
      { value: "none", label: "None of the above", exclusive: true },
    ],
    excludeFromScore: ["none"],
    order: 10,
  },
  {
    kind: "question",
    id: "symptoms_eye",
    type: "checkbox_multi",
    part: 1,
    text: "Do you experience any of the following eye symptoms? (Check all that apply)",
    options: [
      { value: "itchy_eyes", label: "Itchy eyes" },
      { value: "red_eyes", label: "Red or bloodshot eyes" },
      { value: "watery_eyes", label: "Watery eyes" },
      { value: "swollen_eyelids", label: "Swollen eyelids" },
      { value: "none", label: "None of the above", exclusive: true },
    ],
    excludeFromScore: ["none"],
    order: 11,
  },
  {
    kind: "question",
    id: "symptoms_sinus",
    type: "checkbox_multi",
    part: 1,
    text: "Do you experience any of the following sinus symptoms? (Check all that apply)",
    options: [
      { value: "facial_pressure", label: "Facial pressure or pain" },
      { value: "headaches", label: "Headaches" },
      { value: "smell_loss", label: "Reduced sense of smell" },
      { value: "none", label: "None of the above", exclusive: true },
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
    kind: "question",
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
      // Deliberately NOT exclusive (D-14): a patient can be rarely symptomatic AND symptomatic in
      // spring. excludeFromScore and exclusive are independent — do not derive one from the other.
      { value: "only_rarely", label: "Only rarely do I have symptoms" },
    ],
    excludeFromScore: ["only_rarely"],
    order: 20,
  },
  {
    kind: "question",
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
      { value: "none", label: "None of the above", exclusive: true },
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
    kind: "question",
    id: "severity_nasal_congestion",
    type: "severity_0_3",
    part: 3,
    text: "Nasal congestion",
    subtitle: "Rate your symptoms over the past week",
    order: 30,
  },
  {
    kind: "question",
    id: "severity_sneezing",
    type: "severity_0_3",
    part: 3,
    text: "Sneezing",
    order: 31,
  },
  {
    kind: "question",
    id: "severity_runny_nose",
    type: "severity_0_3",
    part: 3,
    text: "Runny nose",
    order: 32,
  },
  {
    kind: "question",
    id: "severity_nasal_itching",
    type: "severity_0_3",
    part: 3,
    text: "Nasal itching",
    order: 33,
  },
  {
    kind: "question",
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
    kind: "question",
    id: "impact_sleep",
    type: "frequency_0_4",
    part: 4,
    text: "How often do your nasal or eye symptoms interfere with your sleep quality?",
    order: 40,
  },
  {
    kind: "question",
    id: "impact_daily",
    type: "frequency_0_4",
    part: 4,
    text: "How often do they interfere with daily activities (work, school, exercise)?",
    order: 41,
  },
  {
    kind: "question",
    id: "impact_concentrate",
    type: "frequency_0_4",
    part: 4,
    text: "How often do they interfere with your ability to concentrate?",
    order: 42,
  },
  {
    kind: "question",
    id: "impact_social",
    type: "frequency_0_4",
    part: 4,
    text: "How often do they interfere with social activities or outdoor enjoyment?",
    order: 43,
  },
  {
    kind: "question",
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
    kind: "question",
    id: "taking_meds",
    type: "yesno",
    part: 5,
    text: "Are you currently taking any allergy medications?",
    order: 50,
  },
  {
    kind: "question",
    id: "med_list",
    type: "text_input",
    part: 5,
    text: "Please list your current allergy medications and dosages",
    order: 51,
    // Replaces the renderer's hardcoded `part === 5 && id === "med_list"` visibility guard.
    // Question IDs are unique across the set, so no additional part check is needed.
    showIf: { questionId: "taking_meds", equals: "yes" },
  },
  {
    kind: "question",
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
    showIf: { questionId: "taking_meds", equals: "yes" },
  },
  {
    kind: "question",
    id: "diagnosed_allergic_condition",
    type: "yesno",
    part: 5,
    // UNCONFIRMED clinical copy — DIAG-01's scope (whether it duplicates HIST-01's comorbidity
    // checklist) is still open with William; see CONTEXT.md <specifics> #3 and D-10.
    text: "Has a healthcare provider ever diagnosed you with an allergic condition (for example, allergic rhinitis, asthma, or eczema)?",
    order: 53,
    // scoreQuestion returns 0 for yesno, so this contributes zero to the score even though
    // PART5_TREATMENT is inside ALL_SCORED_QUESTIONS.
  },
];

// ─────────────────────────────────────────────
// PART 6 — Medical History (mandatory, no score)
// Every patient passes through this part before the outcome page (D-13). Nothing here is
// scored — ALL_SCORED_QUESTIONS stays Parts 1-5 only (D-04). The prior two-question checklist
// here (the two "personal"/"family" checkbox questions, both required: false) is replaced
// wholesale by HIST-01..HIST-04 (D-01/D-03).
// ─────────────────────────────────────────────

export const PART6_MEDICAL_HISTORY: QuizItem[] = [
  {
    kind: "question",
    id: "history_comorbidities",
    type: "checkbox_multi",
    part: 6,
    // Proposed copy (UNCONFIRMED) — see CONTEXT.md D-07 / 03-UI-SPEC.md Copywriting Contract.
    text: "Do you have a personal history of any of the following conditions? (Check all that apply)",
    options: [
      { value: "asthma", label: "Asthma" },
      { value: "eczema", label: "Eczema" },
      { value: "anaphylaxis", label: "Anaphylaxis" },
      { value: "heart_disease", label: "Heart disease" },
      { value: "copd", label: "COPD" },
      { value: "lung_disease", label: "Lung disease" },
      { value: "cancer", label: "Cancer" },
      { value: "autoimmune", label: "Autoimmune conditions" },
      { value: "immune_deficiency", label: "Immune system deficiencies (acquired / induced)" },
      { value: "angioedema", label: "Angioedema" },
      // Exclusive option (D-07). Independent of excludeFromScore below (D-14) — do not derive
      // one from the other. Per the D-13 reversal, selecting this must never disable siblings.
      { value: "none", label: "None of the above", exclusive: true },
    ],
    excludeFromScore: ["none"],
    order: 60,
    // required omitted — defaults to true (Phase 2 D-05). The "none of the above" option is what
    // makes this reachable for a healthy patient ([] alone does not satisfy a required checkbox
    // question — Phase 2 D-06).
  },
  {
    kind: "question",
    id: "current_medications",
    type: "text_input",
    part: 6,
    // LOCKED copy, verbatim — 03-UI-SPEC.md Copywriting Contract / REQUIREMENTS.md HIST-02.
    text: "What medications (including dosage) are you currently taking (please list all)",
    // UNCONFIRMED proposed subtitle — see <required_ness_decision> in 03-01-PLAN.md.
    subtitle: "If you are not currently taking any medications, enter None.",
    order: 61,
    // MUST be isAnswered, not equals — "including none of the above" is precisely the case
    // equals cannot express (D-08). required omitted (defaults to true) — see plan's
    // required_ness_decision for why this field stays required unlike the HIST-03 reveals below.
    showIf: { questionId: "history_comorbidities", isAnswered: true },
  },
  {
    kind: "question",
    id: "history_surgeries_has",
    type: "yesno",
    part: 6,
    text: "Have you had any previous surgeries?",
    order: 62,
  },
  {
    kind: "question",
    id: "history_surgeries",
    type: "text_input",
    part: 6,
    text: "Please list your previous surgeries and the approximate dates.",
    order: 63,
    showIf: { questionId: "history_surgeries_has", equals: "yes" },
    required: false,
  },
  {
    kind: "question",
    id: "history_allergies_has",
    type: "yesno",
    part: 6,
    text: "Do you have any known medication, food, or environmental allergies?",
    order: 64,
  },
  {
    kind: "question",
    id: "history_allergies",
    type: "text_input",
    part: 6,
    text: "Please list your known allergies (medication, food, or environmental).",
    order: 65,
    showIf: { questionId: "history_allergies_has", equals: "yes" },
    required: false,
  },
  {
    kind: "question",
    id: "history_conditions_has",
    type: "yesno",
    part: 6,
    text: "Do you have any other medical conditions not already listed?",
    order: 66,
  },
  {
    kind: "question",
    id: "history_conditions",
    type: "text_input",
    part: 6,
    // UNCONFIRMED clinical copy — this is the truncated third label from William's 6/27 email.
    // Probable wording pending confirmation; see CONTEXT.md <specifics> #4 and 03-UI-SPEC.md.
    text: "Please list any other medical conditions that you have.",
    order: 67,
    showIf: { questionId: "history_conditions_has", equals: "yes" },
    required: false,
  },
  {
    kind: "question",
    id: "has_pcp",
    type: "yesno",
    part: 6,
    text: "Do you have a Primary Care Physician (PCP)?",
    order: 68,
  },
  {
    kind: "question",
    id: "pcp_clinic_name",
    type: "text_input",
    part: 6,
    text: "What is the name of your PCP's clinic?",
    order: 69,
    // required omitted — defaults to true. D-09: both clinic fields are required when visible.
    showIf: { questionId: "has_pcp", equals: "yes" },
  },
  {
    kind: "question",
    id: "pcp_clinic_address",
    type: "text_input",
    part: 6,
    text: "What is the address of your PCP's clinic?",
    order: 70,
    // required omitted — defaults to true. D-09: both clinic fields are required when visible.
    showIf: { questionId: "has_pcp", equals: "yes" },
  },
  {
    kind: "info",
    id: "no_pcp_recommendation",
    // LOCKED copy, verbatim — 03-UI-SPEC.md Copywriting Contract / CONTEXT.md D-09. No heading,
    // no bullets, no invented text around this sentence. MUST NOT declare `required` — the
    // compiler enforces that on QuizInfoBlock.
    paragraphs: [
      "We recommend that you establish with a primary care physician before beginning SLIT.",
    ],
    order: 71,
    part: 6,
    showIf: { questionId: "has_pcp", equals: "no" },
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

// Helper: get question by id. Filters with an inline type predicate (item.kind === "question")
// rather than importing isQuestion from ./schema — schema.ts imports getQuestionById from this
// file, so an import in the other direction would be circular. Do not "simplify" this into an
// isQuestion import.
export function getQuestionById(id: string): QuizQuestion | undefined {
  return [...ALL_SCORED_QUESTIONS, ...PART6_MEDICAL_HISTORY]
    .filter((item): item is QuizQuestion => item.kind === "question")
    .find((q) => q.id === id);
}

/** Ordered parts 1–6 for the main quiz flow. QuizItem[][] so a part can hold an info block (Part
 *  6's no_pcp_recommendation) without a further type change. Part 6 (medical history) is reached
 *  by 100% of patients — see 03-CONTEXT.md D-13. */
export const QUIZ_PARTS: QuizItem[][] = [
  PART1_SYMPTOM_CHECKLIST,
  PART2_TIMING_TRIGGERS,
  PART3_SEVERITY,
  PART4_IMPACT,
  PART5_TREATMENT,
  PART6_MEDICAL_HISTORY,
];

// Derived from QUIZ_PARTS so a new part can never be omitted from the payload boundary by
// accident (D-03). Replaces the old explicit ALL_SCORED_QUESTIONS + PART6_MEDICAL_HISTORY
// concatenation and the Part-6 carve-out it existed to preserve.
export const ALL_ITEMS: QuizItem[] = QUIZ_PARTS.flat();
