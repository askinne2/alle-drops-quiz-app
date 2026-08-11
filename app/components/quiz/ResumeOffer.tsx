import { useEffect, useRef, useState } from "react";
import styles from "../../styles/quiz.module.css";

/**
 * app/components/quiz/ResumeOffer.tsx
 *
 * Every new patient-facing surface Phase 04.2 adds: the resume offer, the persistent in-flow
 * "Start over" control, the shared two-step confirm panel both of those trigger, and the
 * post-resume restoration notice.
 *
 * PRESENTATIONAL ONLY. This file imports nothing beyond React and the CSS Modules stylesheet —
 * no storage module, no question schema, no flow logic. Every guarantee below (D-06's zero
 * identity, D-08's confirm gate) is provable by rendering these components with plain callback
 * props, which is exactly what tests/quiz-resume-offer-dom.test.ts does.
 *
 * D-06 — the resume offer must reveal ZERO identity. `ResumeOfferProps` and
 * `StartOverControlProps` below carry only callbacks. Do not add a `patientName`, `savedAt`,
 * `answeredCount`, or any similar prop, even "for later" — that absence is the mechanism, not an
 * implementation detail that can be patched in afterward.
 *
 * D-08 — a destructive action (clearing a draft) must never fire on a single tap. Both
 * `ResumeOffer`'s "Start over" button and `StartOverControl`'s "Start over" button open
 * `StartOverConfirmPanel` instead of calling their destructive callback directly. The panel's
 * safe option ("Keep my answers" / "Keep my progress") renders first and receives programmatic
 * focus on open, so a patient who reflexively presses Enter a second time lands on the safe
 * choice, not the destructive one.
 */

interface StartOverConfirmPanelProps {
  heading: string;
  body: string;
  dismissLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Shared two-step confirm panel used by both `ResumeOffer`'s "Start over" button and
 * `StartOverControl`'s "Start over" button. Deliberately carries neither the ARIA dialog role nor
 * the ARIA alert-dialog role — this is an inline disclosure with no focus trap and no Escape
 * handling, and claiming that contract without the behavior that backs it would be worse than
 * omitting it. `aria-live` announces the panel's appearance instead.
 *
 * The dismiss button renders FIRST and receives focus via `useEffect` on mount — the direct
 * mis-tap mitigation named above. The destructive button renders second and is never focused
 * automatically.
 */
function StartOverConfirmPanel({
  heading,
  body,
  dismissLabel,
  onConfirm,
  onDismiss,
}: StartOverConfirmPanelProps) {
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismissButtonRef.current?.focus();
  }, []);

  return (
    <div aria-live="polite">
      <h2 className={styles.questionCategory__title}>{heading}</h2>
      <p className={styles.questionCard__subtitle}>{body}</p>
      <div className={styles.questionCard__optionsVertical}>
        <button
          ref={dismissButtonRef}
          type="button"
          className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
          onClick={onDismiss}
        >
          {dismissLabel}
        </button>
        <button
          type="button"
          className={`${styles.quizNavigation__button} ${styles.quizStartOver__confirmButton}`}
          onClick={onConfirm}
        >
          Yes, start over
        </button>
      </div>
    </div>
  );
}

export interface ResumeOfferProps {
  onResume: () => void;
  onStartOver: () => void;
}

/**
 * The resume-offer screen (UI-SPEC Component Inventory §1 and §3, resume-offer variant). Renders
 * before anyone has proven they are the patient, so the heading and subtitle below are the
 * complete, permanent copy of this screen — no name, no DOB, no email, no phone, no elapsed time,
 * ever. They stay visible in both the resting state and the confirm state.
 */
export function ResumeOffer({ onResume, onStartOver }: ResumeOfferProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className={styles.questionCard}>
      <h2 className={styles.questionCategory__title}>
        You have an unfinished assessment from earlier.
      </h2>
      <p className={styles.questionCard__subtitle}>
        Resume where you left off, or start over?
      </p>
      {showConfirm ? (
        <StartOverConfirmPanel
          heading="Start over and lose your saved answers?"
          body="This clears everything you entered earlier. This can't be undone."
          dismissLabel="Keep my answers"
          onConfirm={onStartOver}
          onDismiss={() => setShowConfirm(false)}
        />
      ) : (
        <div className={styles.questionCard__optionsVertical}>
          <button
            type="button"
            className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
            onClick={onResume}
          >
            Resume
          </button>
          <button
            type="button"
            className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
            onClick={() => setShowConfirm(true)}
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

export interface StartOverControlProps {
  onStartOver: () => void;
}

/**
 * The persistent in-flow "Start over" control (UI-SPEC §2 and §3, in-flow variant). Low-emphasis
 * text button, deliberately not accent-colored — it must not visually compete with Next/Continue
 * for primary weight. The literal label is "Start over", identical to the resume offer's
 * secondary button, so a patient recognizes it as the same action wherever it appears. Never
 * "Reset", "Clear", "Restart", or "Start fresh".
 */
export function StartOverControl({ onStartOver }: StartOverControlProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className={styles.quizStartOverRow}>
      <button
        type="button"
        className={styles.quizStartOver}
        onClick={() => setShowConfirm(true)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 4v6h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 15a8 8 0 1 0 2-8.5L4 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Start over
      </button>
      {showConfirm && (
        <div className={styles.quizStartOver__confirm}>
          <StartOverConfirmPanel
            heading="Start over and lose your progress?"
            body="This clears everything you've entered in this assessment so far. This can't be undone."
            dismissLabel="Keep my progress"
            onConfirm={onStartOver}
            onDismiss={() => setShowConfirm(false)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Post-resume restoration notice (UI-SPEC §5, D-06-safe restoration feedback). Reproduces the
 * existing info-block visual family verbatim — same card class, same `role="note"`, same inline
 * info-icon SVG, one paragraph. Rendered once on the first render of the step a patient is
 * restored into. Carries zero identity, zero answer content, and zero counts — a count of
 * restored answers would itself be a D-06 leak by degrees.
 */
export function RestorationNotice() {
  return (
    <div className={styles.infoBlockCard} role="note">
      <div className={styles.infoBlockCard__icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="rgb(var(--color-button, 0, 123, 255))" strokeWidth="2" />
          <line
            x1="12"
            y1="11"
            x2="12"
            y2="16"
            stroke="rgb(var(--color-button, 0, 123, 255))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="7.5" r="1.25" fill="rgb(var(--color-button, 0, 123, 255))" />
        </svg>
      </div>
      <p className={styles.infoBlockCard__paragraph}>
        Your previous answers have been restored.
      </p>
    </div>
  );
}
