/**
 * Quiz Container — clinical questionnaire flow (TN/TX gate, parts 1–5, outcomes, optional part 6 + consent).
 */

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { QuizProgress } from "./QuizProgress";
import { StateGate } from "./StateGate";
import { IneligibleMessage } from "./IneligibleMessage";
import { PatientInfoStep, validatePatientInfoStep, type PatientInfoValues } from "./PatientInfoStep";
import { QuizPartRenderer, isPartComplete } from "./QuizPartRenderer";
import { ConsentStep } from "./ConsentStep";
import { ResultsDisplay } from "./ResultsDisplay";
import { QUIZ_PARTS, PART6_MEDICAL_HISTORY, ALL_SCORED_QUESTIONS } from "../../lib/quiz/questions";
import {
  calculateTotalScore,
  getScoreBracket,
  generateSymptomProfileId,
  type ScoreBracket,
} from "../../lib/quiz/scoring";
import { type QuizAnswers, type QuizQuestion } from "../../lib/quiz/types";
import { CONSENT_VERSION } from "../../lib/consent-version";
import { getProductHandle, type QuizProductConfig } from "../../lib/quiz/product-links";
import {
  getRedirectTarget,
  REDIRECT_FALLBACK,
  type QuizRedirectConfig,
  type RedirectKind,
} from "../../lib/quiz/redirects";
import { toRelativePath } from "../../lib/quiz/navigation";
import styles from "../../styles/quiz.module.css";

type FlowStep =
  | "state_gate"
  | "patient_info"
  | "quiz_parts"
  | "outcome"
  | "medical_history"
  | "consent"
  | "ineligible"
  | "submitting"
  | "completed"
  | "error";

const isTestModeEnabled = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("test") === "1" || (window as unknown as { AlleDropsQuizConfig?: { testMode?: boolean } }).AlleDropsQuizConfig?.testMode === true;
};

/**
 * Where a quiz exit should send the patient: merchant configuration, else the module fallback.
 *
 * This is the thin browser-global wrapper over `getRedirectTarget`; the resolution rules and the
 * fallback values live in `app/lib/quiz/redirects.ts` so they are testable without a DOM. Callers
 * do not need an `||` fallback of their own — one is always returned.
 */
function getRedirectUrl(kind: RedirectKind): string {
  if (typeof window === "undefined") return REDIRECT_FALLBACK[kind];
  const cfg = (window as unknown as { AlleDropsQuizConfig?: QuizRedirectConfig })
    .AlleDropsQuizConfig;
  return getRedirectTarget(kind, cfg);
}

/** The product-handle slice of the runtime config, or undefined when unset or server-side. */
function getProductConfig(): QuizProductConfig {
  if (typeof window === "undefined") return undefined;
  return (
    window as unknown as {
      AlleDropsQuizConfig?: { tnProductHandle?: string; txProductHandle?: string };
    }
  ).AlleDropsQuizConfig;
}

/**
 * Send the storefront to a relative path, whether the quiz is framed or standalone.
 *
 * The quiz normally runs in a cross-origin iframe, so it cannot navigate the storefront
 * itself — it posts the target and the parent page performs the navigation. When it is not
 * framed (the bundle-injection path, still supported though not installed) it navigates
 * directly, preserving prior behavior.
 *
 * The target is validated here even though the parent validates it again: a merchant-supplied
 * redirect setting is the one target that never reaches the parent's own guard, because it is
 * refused on this side first.
 */
function navigateParent(path: string): void {
  if (typeof window === "undefined") return;
  const safe = toRelativePath(path);
  if (safe === null) {
    // Diagnosability, not correctness — both live redirect settings are verified relative.
    // A merchant pasting an absolute third-party URL into one of them is refused here, before
    // any message is posted, so without this the rejection would be silent in both windows.
    // Log the rejected target only. Navigation targets carry no PHI and none may be added.
    console.warn("[quiz] refused navigation: target is not a same-origin relative path:", path);
    return;
  }
  if (window.self !== window.top) {
    window.parent.postMessage({ type: "quiz:navigate", path: safe }, "*");
  } else {
    window.location.assign(safe);
  }
}

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
  const [step, setStep] = useState<FlowStep>("state_gate");
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
  const [savedToServer, setSavedToServer] = useState(false);
  const [showProceedWarning, setShowProceedWarning] = useState(false);

  const autoSubmit0to2Attempted = useRef(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window !== "undefined") setShowTestMode(isTestModeEnabled());
  }, []);

  useEffect(() => {
    if (step !== "medical_history") return;
    setAnswers((prev) => ({
      ...prev,
      history_personal: Array.isArray(prev.history_personal) ? prev.history_personal : [],
      history_family: Array.isArray(prev.history_family) ? prev.history_family : [],
    }));
  }, [step]);

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

  const handleAnswerChange = useCallback((questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      if (questionId === "taking_meds" && value === "no") {
        delete next.med_list;
        delete next.med_control;
      }
      return next;
    });
  }, []);

  const buildPayload = useCallback(
    (extra?: { personal_history?: string[]; family_history?: string[] }) => {
      if (!patientState || !symptomProfileId) throw new Error("Missing patient context");
      const s = score ?? calculateTotalScore(ALL_SCORED_QUESTIONS, answers);
      const b = scoreBracket ?? getScoreBracket(s);
      return {
        state: patientState,
        name: patientInfo.name.trim(),
        dob: patientInfo.dob,
        email: patientInfo.email.trim(),
        phone: patientInfo.phone,
        symptom_profile_id: symptomProfileId,
        quiz_score: s,
        score_bracket: b,
        quiz_date: new Date().toISOString(),
        answers,
        completion_time: Math.round((Date.now() - startTime) / 1000),
        consent_version: CONSENT_VERSION,
        ...extra,
      };
    },
    [patientState, symptomProfileId, patientInfo, answers, score, scoreBracket, startTime]
  );

  const submitPayload = useCallback(
    async (extra?: { personal_history?: string[]; family_history?: string[] }) => {
      const payload = buildPayload(extra);
      await postQuiz(payload as unknown as Record<string, unknown>);
    },
    [buildPayload]
  );

  // Auto-save assessments for 0-2 bracket once results are shown
  useEffect(() => {
    if (step !== "outcome" || scoreBracket !== "0-2" || autoSubmit0to2Attempted.current) return;
    if (!symptomProfileId || !patientState) return;
    autoSubmit0to2Attempted.current = true;
    void (async () => {
      try {
        await submitPayload();
        setSavedToServer(true);
      } catch (e) {
        console.error(e);
        autoSubmit0to2Attempted.current = false;
        setSubmissionError(e instanceof Error ? e.message : "Could not save assessment");
      }
    })();
  }, [step, scoreBracket, symptomProfileId, patientState, submitPayload]);

  const goToOutcome = useCallback(() => {
    const s = calculateTotalScore(ALL_SCORED_QUESTIONS, answers);
    const b = getScoreBracket(s);
    setScore(s);
    setScoreBracket(b);
    setStep("outcome");
  }, [answers]);

  const onEligible = (state: "tennessee" | "texas") => {
    setPatientState(state);
    setStep("patient_info");
  };

  const onIneligible = () => setStep("ineligible");

  const patientInfoFieldChange = (field: keyof PatientInfoValues, value: string) => {
    setPatientInfo((p) => ({ ...p, [field]: value }));
  };

  const handleScheduleConsult = useCallback(async () => {
    if (!patientState || !symptomProfileId || score === null || !scoreBracket) return;
    if (!(scoreBracket === "0-2" && savedToServer)) {
      try {
        await submitPayload();
        setSavedToServer(true);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : "Could not save assessment. Please try again.");
        return;
      }
    }
    navigateParent(getRedirectUrl("consult"));
  }, [submitPayload, patientState, symptomProfileId, score, scoreBracket, savedToServer]);

  const handleTestFirst = useCallback(async () => {
    if (!patientState || !symptomProfileId || score === null || !scoreBracket) return;
    try {
      await submitPayload();
      setSavedToServer(true);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not save assessment. Please try again.");
      return;
    }
    navigateParent(getRedirectUrl("testOptions"));
  }, [submitPayload, patientState, symptomProfileId, score, scoreBracket]);

  const handleProceedToPurchase = useCallback(() => {
    setConsentChecked(false);
    setStep("consent");
  }, []);

  const handleProceedWithoutTesting = useCallback(() => {
    setShowProceedWarning(true);
  }, []);

  const handleConfirmProceedWithoutTesting = useCallback(() => {
    setShowProceedWarning(false);
    setConsentChecked(false);
    setStep("medical_history");
  }, []);

  const handleDeclineProceedWithoutTesting = useCallback(() => {
    setShowProceedWarning(false);
    navigateParent(getRedirectUrl("testOptions"));
  }, []);

  const handleConsentSubmit = useCallback(async () => {
    if (!consentChecked) return;
    setStep("submitting");
    setSubmissionError(null);
    try {
      const personal = Array.isArray(answers.history_personal) ? (answers.history_personal as string[]) : undefined;
      const family = Array.isArray(answers.history_family) ? (answers.history_family as string[]) : undefined;
      await submitPayload({ personal_history: personal, family_history: family });
      setSavedToServer(true);
      setStep("completed");
    } catch (e) {
      setSubmissionError(e instanceof Error ? e.message : "Submit failed");
      setStep("error");
    }
  }, [consentChecked, submitPayload, answers]);

  // QUIZ_PARTS widened to QuizItem[][] in Plan 02-01 so Phase 3 can place an info block inside a
  // part without a further type change. QuizPartRenderer and isPartComplete still take
  // QuizQuestion[] this phase (that signature widening is later plan work), so narrow here. This
  // filter is a no-op today — no info block exists in QUIZ_PARTS' actual content yet.
  const currentPartQuestions = (QUIZ_PARTS[currentPartIndex] ?? []).filter(
    (item): item is QuizQuestion => item.kind === "question",
  );
  const quizPartsTotal = QUIZ_PARTS.length;

  // Overall flow: state_gate (1) + patient_info (2) + 5 quiz parts (3-7) = 7 steps
  const TOTAL_FLOW_STEPS = 2 + quizPartsTotal;
  const progressInfo: { fillPct: number; label: string } | null = (() => {
    if (step === "state_gate")
      return { fillPct: 0, label: `Step 1 of ${TOTAL_FLOW_STEPS}` };
    if (step === "patient_info")
      return { fillPct: Math.round((1 / TOTAL_FLOW_STEPS) * 100), label: `Step 2 of ${TOTAL_FLOW_STEPS}` };
    if (step === "quiz_parts")
      return {
        fillPct: Math.round(((2 + currentPartIndex) / TOTAL_FLOW_STEPS) * 100),
        label: `Part ${currentPartIndex + 1} of ${quizPartsTotal}`,
      };
    return null;
  })();

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

  if (step === "completed") {
    return (
      <div className={styles.quizContainer}>
        <div className={styles.questionCard}>
          <div className={styles.quizCompleted}>
            <div className={styles.quizCompleted__icon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="rgba(76,175,80,0.12)" stroke="#4CAF50" strokeWidth="2"/>
                <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#4CAF50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={styles.questionCategory__title}>Thank You</h2>
            <p className={styles.quizContainer__subtitle}>
              Your assessment has been submitted successfully.
            </p>
            {symptomProfileId && (
              <div className={styles.quizCompleted__profileId}>
                <span>Profile ID:</span>
                <strong>{symptomProfileId}</strong>
              </div>
            )}
            <div className={styles.quizCompleted__actions}>
              <button
                type="button"
                className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                onClick={() => navigateParent("/")}
              >
                Return Home
              </button>
              {patientState && (
                <a
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  href={`/products/${getProductHandle(patientState, getProductConfig())}`}
                >
                  Go to AlleDrops Product Page
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              items={currentPartQuestions}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
            {renderNavRow(
              <>
                {currentPartIndex > 0 ? (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                    onClick={() => setCurrentPartIndex((i) => i - 1)}
                  >
                    ← Previous
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                    onClick={() => setStep("patient_info")}
                  >
                    ← Previous
                  </button>
                )}
                {currentPartIndex < quizPartsTotal - 1 ? (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                    disabled={!isPartComplete(currentPartQuestions, answers)}
                    onClick={() => isPartComplete(currentPartQuestions, answers) && setCurrentPartIndex((i) => i + 1)}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                    disabled={!isPartComplete(currentPartQuestions, answers)}
                    onClick={() => isPartComplete(currentPartQuestions, answers) && goToOutcome()}
                  >
                    See results
                  </button>
                )}
              </>
            )}
          </>
        )}

        {step === "outcome" &&
          patientState &&
          symptomProfileId &&
          score !== null &&
          scoreBracket !== null &&
          (showProceedWarning ? (
            <div className={styles.proceedWarning}>
              <h3 className={styles.proceedWarning__heading}>Testing is recommended for your score</h3>
              <p className={styles.proceedWarning__body}>
                Based on your symptom severity, allergy testing helps confirm which allergens to target and improves
                treatment outcomes. You may still choose to proceed with sublingual immunotherapy, and your provider
                will review your medical history before finalizing your plan.
              </p>
              <div className={styles.proceedWarning__actions}>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  onClick={handleConfirmProceedWithoutTesting}
                >
                  Continue without testing
                </button>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  onClick={handleDeclineProceedWithoutTesting}
                >
                  I&apos;d like allergy testing first
                </button>
              </div>
            </div>
          ) : (
            <ResultsDisplay
              score={score}
              scoreBracket={scoreBracket}
              patientState={patientState}
              symptomProfileId={symptomProfileId}
              onScheduleConsult={handleScheduleConsult}
              onProceedToPurchase={handleProceedToPurchase}
              onTestFirst={handleTestFirst}
              onProceedWithoutTesting={handleProceedWithoutTesting}
            />
          ))}

        {step === "medical_history" && (
          <>
            <h2 className={styles.questionCategory__title}>Medical history</h2>
            <QuizPartRenderer
              items={PART6_MEDICAL_HISTORY}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
            {renderNavRow(
              <>
                <button type="button" className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`} onClick={() => setStep("outcome")}>
                  ← Previous
                </button>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  disabled={!isPartComplete(PART6_MEDICAL_HISTORY, answers)}
                  onClick={() => isPartComplete(PART6_MEDICAL_HISTORY, answers) && setStep("consent")}
                >
                  Next →
                </button>
              </>
            )}
          </>
        )}

        {step === "consent" && (
          <>
            <ConsentStep checked={consentChecked} onCheckedChange={setConsentChecked} />
            {renderNavRow(
              <>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  onClick={() => setStep(scoreBracket === "7+" ? "medical_history" : "outcome")}
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
              if (!confirm("Test Mode: fill sample data and jump to outcome?")) return;
              setPatientState("tennessee");
              setPatientInfo({
                name: "Test User",
                dob: "1990-01-02",
                email: "test@example.com",
                phone: "6155551212",
              });
              setSymptomProfileId(generateSymptomProfileId());
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
              const s = calculateTotalScore(ALL_SCORED_QUESTIONS, sample);
              const b = getScoreBracket(s);
              setScore(s);
              setScoreBracket(b);
              setStep("outcome");
            }}
            className={styles.quizContainer__testButton}
          >
            Test Mode: jump to outcome
          </button>
        </div>
      )}
    </div>
  );
}
