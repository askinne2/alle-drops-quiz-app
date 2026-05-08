import styles from "../../styles/quiz.module.css";

interface QuizProgressProps {
  fillPct: number;
  label: string;
}

export function QuizProgress({ fillPct, label }: QuizProgressProps) {
  return (
    <div className={styles.quizProgress} role="progressbar" aria-valuenow={fillPct} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.quizProgress__bar}>
        <span
          className={styles.quizProgress__fill}
          style={{ width: `${fillPct}%` }}
          aria-hidden="true"
        />
      </div>
      <div className={styles.quizProgress__text}>
        <span>{label}</span>
      </div>
    </div>
  );
}
