import styles from "../../styles/quiz.module.css";

interface IneligibleMessageProps {
  onBack: () => void;
}

export function IneligibleMessage({ onBack }: IneligibleMessageProps) {
  return (
    <div className={styles.questionCard}>
      <h2 className={styles.questionCategory__title}>Not Available in Your State</h2>
      <p className={styles.quizContainer__subtitle}>
        Unfortunately, at this time, Allergist on Demand is only available for patients with a primary address
        in either Texas or Tennessee. Please continue checking back as we work to expand our coverage!
      </p>
      <button type="button" className={styles.button} onClick={onBack}>
        Go Back
      </button>
    </div>
  );
}
