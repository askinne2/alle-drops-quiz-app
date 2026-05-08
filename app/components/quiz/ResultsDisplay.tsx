import { useState } from "react";
import { type ScoreBracket } from "../../lib/quiz/scoring";
import styles from "../../styles/quiz.module.css";

export interface ResultsDisplayProps {
  score: number;
  scoreBracket: ScoreBracket;
  patientState: "tennessee" | "texas";
  symptomProfileId: string;
  onScheduleConsult: () => void;
  onProceedToPurchase: () => void;
  onTestFirst: () => void;
  onProceedWithoutTesting: () => void;
}

export function ResultsDisplay({
  score,
  scoreBracket,
  patientState,
  symptomProfileId,
  onScheduleConsult,
  onProceedToPurchase,
  onTestFirst,
  onProceedWithoutTesting,
}: ResultsDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(symptomProfileId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.quizResults} data-patient-state={patientState}>
      <div className={styles.quizResults__header}>
        <h2 className={styles.quizResults__title}>Your Assessment Results</h2>
      </div>

      <div className={styles.quizResults__mainGrid}>
        <div className={styles.quizResults__leftColumn}>
          <div className={styles.quizResults__scoreContainer}>
            <div className={styles.quizResults__scoreCircle}>
              <span className={styles.quizResults__scoreNumber}>{score}</span>
            </div>
            <div className={styles.quizResults__severity}>
              <span className={styles.quizResults__severityLabel}>Your Assessment Score (bracket):</span>
              <span className={styles.quizResults__severityValue}>{scoreBracket}</span>
            </div>
          </div>

          {scoreBracket === "0-2" && (
            <div className={styles.quizResults__recommendation}>
              <div className={styles.quizResults__message}>
                <h3>Your Symptoms Appear Mild and Well-Controlled</h3>
                <p>
                  Based on your responses, your allergy symptoms appear to be mild and well-controlled. Continue your
                  current management approach with over-the-counter medications as needed. However, if your symptoms
                  worsen, occur more frequently, or begin to interfere with your daily activities, consider completing
                  this questionnaire again or scheduling an appointment with an allergist.
                </p>
              </div>
              <div className={styles.quizResults__actions}>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  onClick={onScheduleConsult}
                >
                  Schedule a Consultation
                </button>
              </div>
            </div>
          )}

          {scoreBracket === "3-6" && (
            <div className={styles.quizResults__recommendation}>
              <div className={styles.quizResults__message}>
                <h3>You May Benefit From Seeing an Allergist</h3>
                <p>
                  Based on your responses, you may benefit from seeing an allergist. While your symptoms are not
                  severe, they are affecting your daily life and could be better controlled. An allergist can help
                  identify your triggers and optimize your treatment plan.
                </p>
              </div>
              <div className={styles.quizResults__actions}>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  onClick={onScheduleConsult}
                >
                  Schedule a Telehealth Appointment
                </button>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  onClick={onProceedToPurchase}
                >
                  Continue to Purchase AlleDrops
                </button>
              </div>
            </div>
          )}

          {scoreBracket === "7+" && (
            <div className={styles.quizResults__recommendation}>
              <div className={styles.quizResults__message}>
                <h3>Sublingual Immunotherapy May Significantly Help You</h3>
                <p>
                  Based on your responses, you would likely benefit from beginning sublingual immunotherapy. Your
                  symptoms are moderate-to-severe, significantly affecting your quality of life, or not adequately
                  controlled with current treatment. An allergist can perform testing to identify your specific triggers
                  and develop a comprehensive treatment plan, which may include prescription medications or
                  immunotherapy. We recommend proceeding with allergy testing, to identify specific allergens that may be
                  causing your symptoms.
                </p>
              </div>
              <div className={styles.quizResults__actions}>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  onClick={onTestFirst}
                >
                  I&apos;d Like Allergy Testing First
                </button>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  onClick={onProceedWithoutTesting}
                >
                  Proceed Without Testing
                </button>
              </div>
            </div>
          )}

          <div className={styles.quizResults__profile}>
            <p className={styles.quizResults__profileText}>Your Symptom Profile ID:</p>
            <div className={styles.quizResults__profileId}>
              <strong className={styles.quizResults__profileIdValue}>{symptomProfileId}</strong>
              <button
                type="button"
                className={styles.quizResults__copyButton}
                onClick={handleCopy}
                aria-label="Copy Symptom Profile ID"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className={styles.quizResults__profileNote}>
              Save this ID for your records. Share it with our team if needed.
            </p>
          </div>

          <div className={styles.quizResults__disclaimer}>
            <p>
              <strong>Disclaimer:</strong> This assessment is not a medical diagnosis. Consult a qualified healthcare
              provider before starting any treatment.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
