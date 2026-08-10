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
    // UAT (session 33): the original wording carried "(for example, allergic rhinitis, asthma, or
    // eczema)". Andrew read it back-to-back with HIST-01's comorbidity checklist — which asks the
    // patient to tick asthma and eczema from a list one part later — and it read as the same
    // question asked twice. That is the exact redundancy ROADMAP.md flagged for DIAG-01
    // ("ask once whether the allergy-diagnosis question is distinct from this checklist").
    // The questions ARE distinct (D-10): diagnosed-by-a-clinician is not the same fact as
    // has-this-comorbidity. Only the examples collided, so the examples were dropped rather than
    // the question. Do not reintroduce condition names here that appear in HIST-01's options.
    text: "Has a healthcare provider ever diagnosed you with an allergic condition?",
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
    // UAT-added gate (session 33). Browser UAT found `current_medications` was required with no
    // escape: a healthy patient ticks "None of the above" on the comorbidity list, the medications
    // box appears, and they must type something to advance. Isolated in the DOM — filling only this
    // field enabled Next while all three HIST-03 reveals sat empty; clearing it disabled Next again.
    //
    // That is the exact friction D-06 removed for the three HIST-03 free-text fields. HIST-02 never
    // got a gate because REQUIREMENTS.md never states its required-ness, so it silently inherited
    // Phase 2 D-05's default of `true`. Andrew's call: give it the same "none" gate as HIST-03.
    //
    // Copy is deliberately worded to distinguish it from Part 5's `taking_meds`, which asks only
    // about ALLERGY medications. Naming the difference explicitly avoids the read-as-duplicate
    // problem that DIAG-01's example text hit earlier in this same UAT pass.
    kind: "question",
    id: "history_medications_has",
    type: "yesno",
    part: 6,
    // UNCONFIRMED proposed copy — confirm with William alongside the HIST-03 third label.
    text: "Are you currently taking any medications of any kind, including ones unrelated to allergies?",
    order: 61,
    // DELIBERATELY UNCONDITIONAL — no `showIf`, exactly like the three HIST-03 gates below.
    //
    // The first attempt gated this on `history_comorbidities` isAnswered, to preserve HIST-02's
    // literal "checking any box reveals the field" wording. The `no chained showIf (forward guard)`
    // test in schema.test.ts caught it, correctly: that created a two-level chain
    // (current_medications -> history_medications_has -> history_comorbidities), and Phase 2's
    // `evaluateShowIf` is NON-TRANSITIVE by design — it reads raw answers, not whether the
    // referenced question is itself visible. A patient who answered this gate "yes" and then
    // cleared their comorbidity list would hide the gate while `current_medications` kept
    // rendering underneath it. Orphan field, silent, no error.
    //
    // KNOWN DEVIATION from HIST-02's literal wording: the medications QUESTION is now always
    // present in Part 6 rather than revealed by a comorbidity selection. The medications LIST is
    // still progressively revealed, one level down. This is the same shape as HIST-03 and it is
    // what removes the chain. Flag to William with the other Part 6 copy items.
    //
    // required omitted — defaults to true (Phase 2 D-05). The gate is what every patient must
    // answer; the list below is only required of patients who say yes.
  },
  {
    kind: "question",
    id: "current_medications",
    type: "text_input",
    part: 6,
    // LOCKED copy, verbatim — 03-UI-SPEC.md Copywriting Contract / REQUIREMENTS.md HIST-02.
    text: "What medications (including dosage) are you currently taking (please list all)",
    order: 62,
    // Now a D-06 gate+reveal pair, identical in shape to the three HIST-03 pairs below. The
    // `showIf` + `required: false` combination is also what `isRevealItem` detects, so this pair
    // picks up the same visual fusion treatment automatically — no question-ID literal involved.
    // The old "if you are not taking any medications, enter None." subtitle is gone: the gate now
    // carries that meaning, and the record distinguishes "said no" from "typed None".
    showIf: { questionId: "history_medications_has", equals: "yes" },
    required: false,
  },
  {
    kind: "question",
    id: "history_surgeries_has",
    type: "yesno",
    part: 6,
    text: "Have you had any previous surgeries?",
    order: 63,
  },
  {
    kind: "question",
    id: "history_surgeries",
    type: "text_input",
    part: 6,
    text: "Please list your previous surgeries and the approximate dates.",
    order: 64,
    showIf: { questionId: "history_surgeries_has", equals: "yes" },
    required: false,
  },
  {
    kind: "question",
    id: "history_allergies_has",
    type: "yesno",
    part: 6,
    text: "Do you have any known medication, food, or environmental allergies?",
    order: 65,
  },
  {
    kind: "question",
    id: "history_allergies",
    type: "text_input",
    part: 6,
    text: "Please list your known allergies (medication, food, or environmental).",
    order: 66,
    showIf: { questionId: "history_allergies_has", equals: "yes" },
    required: false,
  },
  {
    kind: "question",
    id: "history_conditions_has",
    type: "yesno",
    part: 6,
    text: "Do you have any other medical conditions not already listed?",
    order: 67,
  },
  {
    kind: "question",
    id: "history_conditions",
    type: "text_input",
    part: 6,
    // UNCONFIRMED clinical copy — this is the truncated third label from William's 6/27 email.
    // Probable wording pending confirmation; see CONTEXT.md <specifics> #4 and 03-UI-SPEC.md.
    text: "Please list any other medical conditions that you have.",
    order: 68,
    showIf: { questionId: "history_conditions_has", equals: "yes" },
    required: false,
  },
  {
    kind: "question",
    id: "has_pcp",
    type: "yesno",
    part: 6,
    text: "Do you have a Primary Care Physician (PCP)?",
    order: 69,
  },
  {
    kind: "question",
    id: "pcp_clinic_name",
    type: "text_input",
    part: 6,
    text: "What is the name of your PCP's clinic?",
    order: 70,
    // required omitted — defaults to true. D-09: both clinic fields are required when visible.
    showIf: { questionId: "has_pcp", equals: "yes" },
  },
  {
    kind: "question",
    id: "pcp_clinic_address",
    type: "text_input",
    part: 6,
    text: "What is the address of your PCP's clinic?",
    order: 71,
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
    order: 72,
    part: 6,
    showIf: { questionId: "has_pcp", equals: "no" },
  },
];

// ─────────────────────────────────────────────
// PART 7 — Allergy Testing Split (mandatory, no score)
// Every patient passes through this part before consent (D-06/D-07). Nothing here is scored —
// ALL_SCORED_QUESTIONS stays Parts 1-5 only (D-04's guarantee, unchanged by Phase 4). The required
// `file_multi` upload question (testing_files) plus its guidance info block
// (testing_upload_requirements) were appended by plan 04-16 once Blockers 1-3 cleared — see
// 04-UPLOAD-DECISIONS.md §Ratified for the size caps substituted into their copy below. Widened
// from QuizQuestion[] to QuizItem[] (same widening PART6_MEDICAL_HISTORY already needed) so the
// info block can share this array.
// ─────────────────────────────────────────────

export const PART7_ALLERGY_TESTING: QuizItem[] = [
  {
    kind: "question",
    id: "testing_status",
    type: "radio_single",
    part: 7,
    // UNCONFIRMED proposed copy — 04-UI-SPEC.md "Proposed copy" table, not yet confirmed with
    // William. The two option labels below ARE locked verbatim (quoted identically in ROADMAP.md
    // and REQUIREMENTS.md TEST-02/TEST-03) and must not be reworded alongside this text.
    text: "Have you already had allergy testing?",
    subtitle:
      'If you choose "I\'ve already had allergy testing," you\'ll be asked to upload a copy of your results (PDF or photo) to continue.',
    options: [
      { value: "needs_testing", label: "I need allergy testing" },
      { value: "had_testing", label: "I've already had allergy testing" },
    ],
    order: 70,
    // required omitted — defaults to true (Phase 2 D-05). Exactly two options, no skip option.
    //
    // D-08: this choice is honor-system, recorded in answers_json, and NEVER enforced. Nothing
    // prevents a patient from picking "needs_testing" to dodge the required upload — that is an
    // accepted, named tradeoff (T-4-19), not a bug. Do NOT add an account flag, a server-side
    // gate, or any mechanism that treats this value as authoritative beyond intake-record-keeping.
  },
  {
    kind: "question",
    id: "testing_year",
    type: "text_input_short",
    part: 7,
    // UNCONFIRMED proposed copy — 04-UI-SPEC.md "Proposed copy" table.
    text: "What year did you have your allergy testing done?",
    order: 71,
    // Flat showIf pointing directly at testing_status — evaluateShowIf is non-transitive by
    // design (Phase 2 D-04/HIST-02 gate comment above); do NOT chain this through another Part 7
    // child.
    showIf: { questionId: "testing_status", equals: "had_testing" },
    // required omitted — defaults to true. All three had_testing children are required once
    // revealed (D-02), which is why Part 7 is deliberately excluded from the HIST-03
    // gate/reveal-fusion CSS treatment — see 04-UI-SPEC.md Component Inventory §4.
  },
  {
    kind: "question",
    id: "testing_location",
    type: "text_input_short",
    part: 7,
    // UNCONFIRMED proposed copy — 04-UI-SPEC.md "Proposed copy" table.
    text: "Where did you have your allergy testing done? (Clinic or lab name and city)",
    order: 72,
    showIf: { questionId: "testing_status", equals: "had_testing" },
    // required omitted — defaults to true.
  },
  {
    kind: "question",
    id: "testing_allergens",
    type: "text_input",
    part: 7,
    // LOCKED copy, verbatim, title case exactly as written — REQUIREMENTS.md TEST-03.
    text: "What Allergens Did You React To?",
    order: 73,
    showIf: { questionId: "testing_status", equals: "had_testing" },
    // required omitted — defaults to true.
  },
  {
    kind: "info",
    id: "testing_upload_requirements",
    // UNCONFIRMED proposed copy — 04-UI-SPEC.md "Proposed copy" table, not yet confirmed with
    // William. Same UNCONFIRMED comment convention Phase 3 used for its own proposed copy.
    // Paragraph 2 is the escape-hatch copy — the named mitigation for the abandonment risk D-02
    // accepts (a patient without their results can still finish today via needs_testing). Do not
    // trim it.
    heading: "Uploading Your Results",
    paragraphs: [
      "Upload a photo or PDF of your allergy test results below. We accept PDF, JPEG, PNG, and HEIC files — add more than one if your results are multiple pages. This is required to continue.",
      'Don\'t have your results with you right now? Go back and choose "I need allergy testing" instead so you can finish today — you can always follow up with your results once you\'re tested.',
    ],
    order: 74,
    part: 7,
    showIf: { questionId: "testing_status", equals: "had_testing" },
  },
  {
    kind: "question",
    id: "testing_files",
    type: "file_multi",
    part: 7,
    // UNCONFIRMED proposed copy — 04-UI-SPEC.md "Proposed copy" table.
    text: "Upload your allergy test results",
    // Requirements line, ratified caps substituted (04-UPLOAD-DECISIONS.md §Ratified:
    // MAX_FILE_BYTES = 15 MB, MAX_TOTAL_BYTES = 50 MB). No placeholder braces reach this copy.
    subtitle: "PDF, JPEG, PNG, or HEIC · up to 15 MB per file, 50 MB total.",
    order: 75,
    showIf: { questionId: "testing_status", equals: "had_testing" },
    // required omitted — defaults to true (D-02). Only successfully-uploaded files' tokens ever
    // reach this answer — see QuizPartRenderer.tsx's file_multi branch.
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
  return [...ALL_SCORED_QUESTIONS, ...PART6_MEDICAL_HISTORY, ...PART7_ALLERGY_TESTING]
    .filter((item): item is QuizQuestion => item.kind === "question")
    .find((q) => q.id === id);
}

/** Ordered parts 1–7 for the main quiz flow. QuizItem[][] so a part can hold an info block (Part
 *  6's no_pcp_recommendation) without a further type change. Parts 6 and 7 (medical history and
 *  the allergy-testing split) are each reached by 100% of patients — see 03-CONTEXT.md D-13 and
 *  04-CONTEXT.md D-06/D-07. */
export const QUIZ_PARTS: QuizItem[][] = [
  PART1_SYMPTOM_CHECKLIST,
  PART2_TIMING_TRIGGERS,
  PART3_SEVERITY,
  PART4_IMPACT,
  PART5_TREATMENT,
  PART6_MEDICAL_HISTORY,
  PART7_ALLERGY_TESTING,
];

// Derived from QUIZ_PARTS so a new part can never be omitted from the payload boundary by
// accident (D-03). Replaces the old explicit ALL_SCORED_QUESTIONS + PART6_MEDICAL_HISTORY
// concatenation and the Part-6 carve-out it existed to preserve.
export const ALL_ITEMS: QuizItem[] = QUIZ_PARTS.flat();
