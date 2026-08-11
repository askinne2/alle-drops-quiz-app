/**
 * Quiz Container — clinical questionnaire flow (TN/TX gate, patient info, 7 quiz parts, consent,
 * submit, results). Single path for every score bracket: consent always sits between the last
 * quiz part and the terminal results screen (D-09).
 */

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { QuizProgress } from "./QuizProgress";
import { StateGate } from "./StateGate";
import { IneligibleMessage } from "./IneligibleMessage";
import { PatientInfoStep, validatePatientInfoStep, type PatientInfoValues } from "./PatientInfoStep";
import { QuizPartRenderer, isPartComplete } from "./QuizPartRenderer";
import { ConsentStep } from "./ConsentStep";
import { ResultsDisplay } from "./ResultsDisplay";
import { ResumeOffer, RestorationNotice } from "./ResumeOffer";
import { QUIZ_PARTS, ALL_SCORED_QUESTIONS, ALL_ITEMS } from "../../lib/quiz/questions";
import {
  calculateTotalScore,
  getScoreBracket,
  generateSymptomProfileId,
  type ScoreBracket,
} from "../../lib/quiz/scoring";
import { visibleAnswers, itemsForPart, quizFlowProgress } from "../../lib/quiz/schema";
import { type QuizAnswers } from "../../lib/quiz/types";
import { buildSubmitPayload } from "../../lib/quiz/payload";
import { readDraft, writeDraft, clearDraft, type QuizDraft } from "../../lib/quiz/draft-store";
import styles from "../../styles/quiz.module.css";

// D-09: one path for every bracket — quiz_parts (Part 7 last) -> consent -> submitting -> results
// (terminal). The pre-consent "outcome" screen and the separate post-submit "completed" thank-you
// screen are gone; "results" is the sole terminal step and is only reached after a successful
// submit, replacing both. Score and bracket are still computed on leaving the last quiz part
// (unchanged timing) but are held in state and not displayed until "results" renders.
//
// "resume_offer" (Phase 4.2, RESUME-01) joins the existing unmapped set of the `progressInfo`
// ternary below (the same set "ineligible"/"submitting"/"results"/"error" already fall into) —
// it falls through to that ternary's final `: null` branch with ZERO edits to the ternary itself
// or to app/lib/quiz/schema.ts's NON_PART_STEPS arithmetic. Editing the counter for this step
// would reopen UAT defect #6, which shipped past a green suite.
type FlowStep =
  | "resume_offer"
  | "state_gate"
  | "patient_info"
  | "quiz_parts"
  | "consent"
  | "ineligible"
  | "submitting"
  | "results"
  | "error";

const isTestModeEnabled = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("test") === "1" || (window as unknown as { AlleDropsQuizConfig?: { testMode?: boolean } }).AlleDropsQuizConfig?.testMode === true;
};

async function postQuiz(payload: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const cfg = typeof window !== "undefined"
    ? (window as unknown as { AlleDropsQuizConfig?: { apiEndpoint?: string; shopUrl?: string } }).AlleDropsQuizConfig
    : undefined;
  const apiEndpoint = cfg?.apiEndpoint || "/api/quiz/submit";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg?.shopUrl) headers["X-Shopify-Shop-Domain"] = cfg.shopUrl;
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as { success?: boolean; error?: string };
  if (!response.ok || !result.success) {
    throw new Error(result.error || `Request failed (${response.status})`);
  }
  return { success: true };
}

export function QuizContainer() {
  // Mount-time draft read (RESUME-01). The draft-store helper below collapses EVERY failure
  // reason — storage unavailable (D-01), missing key, expired (D-05), schema mismatch, corrupt
  // JSON, empty answers — to the identical `null`, so this is the ONE branch point for both "no
  // draft" and "storage blocked"; there is deliberately no second storage-availability check here
  // (UI-SPEC § Absent State requires the two reasons be indistinguishable, ideally the same code
  // path). The `typeof window === "undefined"` guard mirrors isTestModeEnabled's own SSR guard.
  const [initialDraft] = useState<QuizDraft | null>(() =>
    typeof window === "undefined" ? null : readDraft()
  );
  const [step, setStep] = useState<FlowStep>(initialDraft ? "resume_offer" : "state_gate");
  const [patientState, setPatientState] = useState<"tennessee" | "texas" | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfoValues>({
    name: "",
    dob: "",
    email: "",
    phone: "",
  });
  const [patientInfoShowErrors, setPatientInfoShowErrors] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [scoreBracket, setScoreBracket] = useState<ScoreBracket | null>(null);
  const [symptomProfileId, setSymptomProfileId] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showTestMode, setShowTestMode] = useState(false);
  // Ephemeral, never persisted. resumedSession selects the D-09/D-11 resumed-session dropzone
  // copy variant passed down to QuizPartRenderer; showRestorationNotice drives the one-time
  // post-resume orientation cue below.
  const [resumedSession, setResumedSession] = useState(false);
  const [showRestorationNotice, setShowRestorationNotice] = useState(false);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window !== "undefined") setShowTestMode(isTestModeEnabled());
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    if (window.self !== window.top) {
      window.parent.postMessage({ type: "quiz:scrollToTop" }, "*");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, currentPartIndex]);

  // D-07: nothing is written to storage until the patient has answered a real quiz question —
  // ROADMAP criterion 2's sharpest requirement is that an untouched page load leaves zero trace.
  // Debounced 500ms trailing write, not a write-on-every-change: several Part 6/Part 7 questions
  // are free text and fire onChange per keystroke, and localStorage.setItem is synchronous, so an
  // undebounced write would block the main thread on every character typed.
  useEffect(() => {
    // No window (SSR) — writeDraft already no-ops without it, but skip scheduling a timer too.
    if (typeof window === "undefined") return;
    // Step gate: only quiz_parts and consent can ever hold a draft-worthy answer. This is also
    // what excludes Test Mode — the Test Mode block below sets a full sample `answers` object and
    // sets `step` to "results" in the same batch, so a QA shortcut behind ?test=1 never persists
    // a synthetic draft. It equally keeps resume_offer/state_gate/patient_info from ever
    // scheduling a write before the patient has engaged with a real quiz question.
    if (step !== "quiz_parts" && step !== "consent") return;
    // Answers gate: the state gate and patient-info typing must leave nothing on disk — identity
    // PHI is only persisted once the patient has answered at least one clinical question. This is
    // the gate that keeps a curious or accidental page load, and a fully-typed-but-not-yet-quizzed
    // patient-info screen, from ever writing a name/DOB/email/phone to a shared device.
    if (Object.keys(answers).length === 0) return;

    const timer = setTimeout(() => {
      writeDraft({
        step: step === "consent" ? "consent" : "quiz_parts",
        patientState,
        patientInfo,
        symptomProfileId,
        currentPartIndex,
        answers,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [answers, currentPartIndex, step, patientState, patientInfo, symptomProfileId]);

  // No special-case deletion here (D-03). A hidden question's answer stays in React state so a
  // patient who flips an answer back and forth never loses typed text with no undo; `visibleAnswers`
  // strips anything hidden at the score/payload boundary instead, so the submitted record and
  // displayed score can never reflect a value the patient can no longer see.
  const handleAnswerChange = useCallback((questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // Thin wrapper over the pure, unit-tested buildSubmitPayload (app/lib/quiz/payload.ts). This is
  // now the ONLY construction site for the submit payload — one implementation, so the one-sitting
  // and resumed paths cannot diverge (D-10 / T-4.2-05).
  const buildPayload = useCallback(
    () =>
      buildSubmitPayload({
        patientState,
        patientInfo,
        symptomProfileId,
        answers,
        score,
        scoreBracket,
        startTime,
      }),
    [patientState, symptomProfileId, patientInfo, answers, score, scoreBracket, startTime]
  );

  const submitPayload = useCallback(
    async () => {
      const payload = buildPayload();
      await postQuiz(payload as unknown as Record<string, unknown>);
    },
    [buildPayload]
  );

  // D-09: the last quiz part computes score/bracket at the same point the pre-consent "outcome"
  // screen used to (immediately on leaving Part 7), but now routes to consent instead of
  // displaying anything — every bracket takes the same path and none can submit without first
  // rendering ConsentStep.
  const goToConsent = useCallback(() => {
    const visible = visibleAnswers(ALL_ITEMS, answers);
    const s = calculateTotalScore(ALL_SCORED_QUESTIONS, visible);
    const b = getScoreBracket(s);
    setScore(s);
    setScoreBracket(b);
    setStep("consent");
  }, [answers]);

  // RESUME-01 / D-09. Applies a restored draft to live state, then computes the landing step.
  // Reads from initialDraft (the lazy mount-time read above), returning immediately if it is
  // null — handleResume is only ever reachable from the resume_offer screen, which itself only
  // renders when initialDraft is non-null, but the guard keeps this function safe standalone.
  const handleResume = useCallback(() => {
    const draft = initialDraft;
    if (!draft) return;

    setPatientState(draft.patientState);
    setPatientInfo(draft.patientInfo);
    setSymptomProfileId(draft.symptomProfileId);
    // The draft-store read has already stripped every file_multi value, so a had_testing
    // patient's restored answers never carry a testing_files entry (D-09/D-11).
    setAnswers(draft.answers);
    setResumedSession(true);
    setShowRestorationNotice(true);

    // D-09's mechanism: land on the lowest part index where isPartComplete is false, REGARDLESS
    // of what draft.step says. After Phase 4.1 the mandatory allergy-test upload is the FIRST
    // part (QUIZ_PARTS[0]), and the draft-store strip above means a had_testing patient's
    // restored answers always leave that part incomplete — so this rule always lands them back
    // on the upload screen. Without it, a draft recorded at step: "consent" would drop a resumed
    // patient straight onto Submit with a missing required upload, breaking both the 04.1 wall
    // (D-09) and payload parity (D-10). This is NOT a "review your answers" screen — UI-SPEC's
    // Flow Contract explicitly forbids adding one — it is the normal part renderer at the normal
    // position.
    let landingIndex: number | null = null;
    for (let i = 0; i < QUIZ_PARTS.length; i++) {
      if (!isPartComplete(itemsForPart(QUIZ_PARTS, i), draft.answers)) {
        landingIndex = i;
        break;
      }
    }

    if (landingIndex !== null) {
      setCurrentPartIndex(landingIndex);
      setStep("quiz_parts");
      return;
    }

    // Every part is complete — honour draft.step. consentChecked is intentionally never restored
    // here (it stays false on every resumed session): CONSENT_VERSION has already been bumped
    // twice this milestone, and a pre-checked box beside text the patient never re-read is a
    // consent integrity problem, not a convenience. score/scoreBracket are recomputed via the
    // same chain goToConsent uses, never read off the draft — QuizDraft has no score field, so
    // there is nothing to restore. startTime is never touched here; its existing
    // useState(() => Date.now()) lazy initializer already gives every mount, resumed or not, a
    // fresh clock, which is what keeps completion_time measuring minutes instead of days.
    if (draft.step === "consent") {
      const visible = visibleAnswers(ALL_ITEMS, draft.answers);
      const s = calculateTotalScore(ALL_SCORED_QUESTIONS, visible);
      const b = getScoreBracket(s);
      setScore(s);
      setScoreBracket(b);
      setStep("consent");
    } else {
      setCurrentPartIndex(draft.currentPartIndex);
      setStep("quiz_parts");
    }
  }, [initialDraft]);

  // D-08. Nothing else needs resetting here — no draft state has been written into React yet at
  // this point (the offer's Start over path never calls handleResume).
  const handleStartOverFromOffer = useCallback(() => {
    clearDraft();
    setStep("state_gate");
  }, []);

  const onEligible = (state: "tennessee" | "texas") => {
    setPatientState(state);
    setStep("patient_info");
  };

  const onIneligible = () => setStep("ineligible");

  const patientInfoFieldChange = (field: keyof PatientInfoValues, value: string) => {
    setPatientInfo((p) => ({ ...p, [field]: value }));
  };

  const handleConsentSubmit = useCallback(async () => {
    if (!consentChecked) return;
    setStep("submitting");
    setSubmissionError(null);
    try {
      await submitPayload();
      // D-08: clear only after a successful submission, never in the catch branch — a transient
      // network error must not cost the patient a ten-minute questionnaire's worth of answers.
      clearDraft();
      setStep("results");
    } catch (e) {
      setSubmissionError(e instanceof Error ? e.message : "Submit failed");
      setStep("error");
    }
  }, [consentChecked, submitPayload]);

  // UAT defect fix: QuizPartRenderer and isPartComplete both already accept the full QuizItem[]
  // union (questions AND info blocks) — a question-only filter here used to strip every info
  // block before it ever reached the renderer. itemsForPart is the pure, tested selector; no
  // filtering happens in this component (see app/lib/quiz/schema.ts).
  const currentPartItems = itemsForPart(QUIZ_PARTS, currentPartIndex);
  const quizPartsTotal = QUIZ_PARTS.length;

  // ONE continuous counter across the whole flow. All arithmetic and copy live in the pure
  // evaluator (quizFlowProgress) so they are testable without rendering — this component only
  // maps its FlowStep onto the evaluator's input. See schema.ts for the UAT defect this fixes.
  const progressInfo = quizFlowProgress(
    step === "state_gate"
      ? { kind: "state_gate" }
      : step === "patient_info"
        ? { kind: "patient_info" }
        : step === "quiz_parts"
          ? { kind: "quiz_part", index: currentPartIndex }
          : step === "consent"
            ? { kind: "consent" }
            : null,
    quizPartsTotal
  );

  const renderNavRow = (children: ReactNode) => (
    <div className={styles.quizNavigation} style={{ marginTop: "1.5rem" }}>
      <div className={styles.quizNavigation__buttons}>{children}</div>
    </div>
  );

  if (step === "error") {
    return (
      <div className={styles.quizError}>
        <h2>Error</h2>
        <p>{submissionError || "There was an error submitting your quiz. Please try again."}</p>
        <button type="button" className={styles.button} onClick={() => setStep("consent")}>
          Back
        </button>
      </div>
    );
  }

  // D-09: the separate "completed" thank-you step is gone. Its two actions (Return Home, Go to
  // AlleDrops Product Page) folded into ResultsDisplay's shared action area (04-UI-SPEC.md
  // Component Inventory §5); ResultsDisplay is now the sole terminal screen, rendered on the
  // "results" step below only after a successful submit.

  if (step === "submitting") {
    return (
      <div className={styles.quizContainer}>
        <div className={styles.quizSubmitting}>
          <div className={styles.quizSubmitting__spinner} aria-hidden="true" />
          <p className={styles.quizSubmitting__text}>Submitting your assessment…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.quizContainer} data-alledrops-quiz>
      {progressInfo && (
        <QuizProgress fillPct={progressInfo.fillPct} label={progressInfo.label} />
      )}

      <div className={styles.quizContainer__questions}>
        {showRestorationNotice && (step === "quiz_parts" || step === "consent") && (
          <RestorationNotice />
        )}

        {step === "resume_offer" && (
          <ResumeOffer onResume={handleResume} onStartOver={handleStartOverFromOffer} />
        )}

        {step === "state_gate" && <StateGate onEligible={onEligible} onIneligible={onIneligible} />}

        {step === "ineligible" && <IneligibleMessage onBack={() => setStep("state_gate")} />}

        {step === "patient_info" && (
          <>
            <PatientInfoStep
              values={patientInfo}
              onChange={patientInfoFieldChange}
              showErrors={patientInfoShowErrors}
            />
            {renderNavRow(
              <>
                <button type="button" className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`} onClick={() => setStep("state_gate")}>
                  ← Previous
                </button>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  onClick={() => {
                    if (!validatePatientInfoStep(patientInfo)) {
                      setPatientInfoShowErrors(true);
                      return;
                    }
                    setSymptomProfileId(generateSymptomProfileId());
                    setCurrentPartIndex(0);
                    setStep("quiz_parts");
                  }}
                >
                  Next →
                </button>
              </>
            )}
          </>
        )}

        {step === "quiz_parts" && (
          <>
            <QuizPartRenderer
              items={currentPartItems}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              resumedSession={resumedSession}
            />
            {renderNavRow(
              <>
                {currentPartIndex > 0 ? (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                    onClick={() => {
                      setShowRestorationNotice(false);
                      setCurrentPartIndex((i) => i - 1);
                    }}
                  >
                    ← Previous
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                    onClick={() => {
                      setShowRestorationNotice(false);
                      setStep("patient_info");
                    }}
                  >
                    ← Previous
                  </button>
                )}
                {currentPartIndex < quizPartsTotal - 1 ? (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                    disabled={!isPartComplete(currentPartItems, answers)}
                    onClick={() => {
                      if (!isPartComplete(currentPartItems, answers)) return;
                      setShowRestorationNotice(false);
                      setCurrentPartIndex((i) => i + 1);
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                    disabled={!isPartComplete(currentPartItems, answers)}
                    onClick={() => {
                      if (!isPartComplete(currentPartItems, answers)) return;
                      setShowRestorationNotice(false);
                      goToConsent();
                    }}
                  >
                    Continue
                  </button>
                )}
              </>
            )}
          </>
        )}

        {step === "results" &&
          patientState &&
          symptomProfileId &&
          score !== null &&
          scoreBracket !== null && (
            <ResultsDisplay
              score={score}
              scoreBracket={scoreBracket}
              patientState={patientState}
              symptomProfileId={symptomProfileId}
              testingStatus={answers.testing_status === "had_testing" ? "had_testing" : "needs_testing"}
            />
          )}

        {step === "consent" && (
          <>
            <ConsentStep checked={consentChecked} onCheckedChange={setConsentChecked} />
            {renderNavRow(
              <>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  onClick={() => {
                    // D-09: consent's Previous no longer targets the deleted "outcome" step — it
                    // re-enters quiz_parts at the last part, the only step that now precedes consent.
                    setShowRestorationNotice(false);
                    setCurrentPartIndex(quizPartsTotal - 1);
                    setStep("quiz_parts");
                  }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonSubmit}`}
                  disabled={!consentChecked}
                  onClick={() => void handleConsentSubmit()}
                >
                  Submit
                </button>
              </>
            )}
          </>
        )}
      </div>

      {showTestMode && (
        <div className={styles.quizContainer__testMode}>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Test Mode: fill sample data and jump to results?")) return;
              setPatientState("tennessee");
              setPatientInfo({
                name: "Test User",
                dob: "1990-01-02",
                email: "test@example.com",
                phone: "6155551212",
              });
              setSymptomProfileId(generateSymptomProfileId());
              // symptoms_sinus: [] carries no answer under D-06 (empty selection no longer counts
              // as answered), but Test Mode bypasses isPartComplete entirely and jumps straight to
              // results — skipping consent and the actual submit — so this is not a behavior
              // change from D-09's perspective; it is a pre-existing dev/QA shortcut (gated behind
              // ?test=1) that never went through consent even before this plan, and it still
              // performs no POST — noted so a future reader comparing this sample against the
              // required rules is not surprised.
              const sample: QuizAnswers = {
                symptoms_nasal: ["sneezing", "runny_nose"],
                symptoms_eye: ["itchy_eyes"],
                symptoms_sinus: [],
                timing_season: ["year_round"],
                timing_triggers: ["dust"],
                severity_nasal_congestion: 3,
                severity_sneezing: 3,
                severity_runny_nose: 2,
                severity_nasal_itching: 2,
                severity_eye_itching: 2,
                impact_sleep: 3,
                impact_daily: 3,
                impact_concentrate: 2,
                impact_social: 2,
                bother_overall: 3,
                taking_meds: "no",
              };
              setAnswers(sample);
              const visible = visibleAnswers(ALL_ITEMS, sample);
              const s = calculateTotalScore(ALL_SCORED_QUESTIONS, visible);
              const b = getScoreBracket(s);
              setScore(s);
              setScoreBracket(b);
              setStep("results");
            }}
            className={styles.quizContainer__testButton}
          >
            Test Mode: jump to results
          </button>
        </div>
      )}
    </div>
  );
}
