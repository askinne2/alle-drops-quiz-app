import styles from "../../styles/quiz.module.css";

interface StateGateProps {
  onEligible: (state: "tennessee" | "texas") => void;
  onIneligible: () => void;
}

export function StateGate({ onEligible, onIneligible }: StateGateProps) {
  return (
    <div className={styles.questionCard}>
      <h2 className={styles.questionCategory__title}>Are you a resident of Tennessee or Texas?</h2>
      <p className={styles.questionCard__subtitle}>
        Allergist on Demand is currently available to patients with a primary address in Tennessee or Texas.
      </p>
      <div className={styles.questionCard__optionsVertical} style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className={`${styles.button} ${styles.quizNavigation__button}`}
          onClick={() => onEligible("tennessee")}
        >
          Yes — I live in Tennessee
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.quizNavigation__button}`}
          onClick={() => onEligible("texas")}
        >
          Yes — I live in Texas
        </button>
        <div className={styles.stateGate__separator}>or</div>
        <button
          type="button"
          className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
          onClick={onIneligible}
        >
          No — I live in another state
        </button>
      </div>
    </div>
  );
}
