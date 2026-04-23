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
import { type QuizAnswers } from "../../lib/quiz/types";
import { PRODUCT_HANDLE_BY_STATE } from "../../lib/quiz/product-links";
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

async function postQuiz(payload: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const apiEndpoint =
    (typeof window !== "undefined" &&
      (window as unknown as { AlleDropsQuizConfig?: { apiEndpoint?: string } }).AlleDropsQuizConfig?.apiEndpoint) ||
    "/api/quiz/submit";
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  const autoSubmit0to2Attempted = useRef(false);

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
    window.location.assign("/pages/consult");
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
    window.location.assign("/pages/test-options");
  }, [submitPayload, patientState, symptomProfileId, score, scoreBracket]);

  const handleProceedToPurchase = useCallback(() => {
    setConsentChecked(false);
    setStep("consent");
  }, []);

  const handleProceedWithoutTesting = useCallback(() => {
    const ok = window.confirm(
      "Although testing is recommended, based on your score severity, you may choose to move forward with sublingual immunotherapy after completing our Medical History Questionnaire. Do you wish to proceed?"
    );
    if (ok) {
      setConsentChecked(false);
      setStep("medical_history");
    } else {
      window.location.assign("/pages/test-options");
    }
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

  const currentPartQuestions = QUIZ_PARTS[currentPartIndex] ?? [];
  const quizPartsTotal = QUIZ_PARTS.length;

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
        <button type="button" onClick={() => setStep("consent")}>
          Back
        </button>
      </div>
    );
  }

  if (step === "completed") {
    return (
      <div className={styles.quizContainer}>
        <h2 className={styles.questionCategory__title}>Thank you</h2>
        <p className={styles.quizContainer__subtitle}>
          Your information has been submitted. {symptomProfileId && <>Profile ID: {symptomProfileId}</>}
        </p>
        <button type="button" className={styles.button} onClick={() => window.location.assign("/")}>
          Return home
        </button>
        {patientState && (
          <p style={{ marginTop: "1rem" }}>
            <a className={styles.button} href={`/products/${PRODUCT_HANDLE_BY_STATE[patientState]}`}>
              Go to AlleDrops product page
            </a>
          </p>
        )}
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div className={styles.quizContainer}>
        <p>Submitting…</p>
      </div>
    );
  }

  return (
    <div className={styles.quizContainer} data-alledrops-quiz>
      {step === "quiz_parts" && (
        <QuizProgress currentCategory={currentPartIndex} totalCategories={quizPartsTotal} />
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
                <button type="button" className={styles.quizNavigation__buttonPrev} onClick={() => setStep("state_gate")}>
                  ← Previous
                </button>
                <button
                  type="button"
                  className={styles.quizNavigation__buttonNext}
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
              questions={currentPartQuestions}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
            {renderNavRow(
              <>
                {currentPartIndex > 0 ? (
                  <button
                    type="button"
                    className={styles.quizNavigation__buttonPrev}
                    onClick={() => setCurrentPartIndex((i) => i - 1)}
                  >
                    ← Previous
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.quizNavigation__buttonPrev}
                    onClick={() => setStep("patient_info")}
                  >
                    ← Previous
                  </button>
                )}
                {currentPartIndex < quizPartsTotal - 1 ? (
                  <button
                    type="button"
                    className={styles.quizNavigation__buttonNext}
                    disabled={!isPartComplete(currentPartQuestions, answers)}
                    onClick={() => isPartComplete(currentPartQuestions, answers) && setCurrentPartIndex((i) => i + 1)}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.quizNavigation__buttonNext}
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
          scoreBracket !== null && (
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
          )}

        {step === "medical_history" && (
          <>
            <h2 className={styles.questionCategory__title}>Medical history</h2>
            <QuizPartRenderer
              questions={PART6_MEDICAL_HISTORY}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
            {renderNavRow(
              <>
                <button type="button" className={styles.quizNavigation__buttonPrev} onClick={() => setStep("outcome")}>
                  ← Previous
                </button>
                <button
                  type="button"
                  className={styles.quizNavigation__buttonNext}
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
                  className={styles.quizNavigation__buttonPrev}
                  onClick={() => setStep(scoreBracket === "7+" ? "medical_history" : "outcome")}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className={styles.quizNavigation__buttonSubmit}
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
