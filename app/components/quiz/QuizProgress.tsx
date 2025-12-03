/**
 * Quiz Progress Component
 * Shows progress indicator for quiz completion
 */

import styles from "../../styles/quiz.module.css";

interface QuizProgressProps {
  currentCategory: number;
  totalCategories: number;
}

export function QuizProgress({ currentCategory, totalCategories }: QuizProgressProps) {
  const percentage = totalCategories > 0 
    ? Math.round(((currentCategory + 1) / totalCategories) * 100) 
    : 0;

  return (
    <div className={styles.quizProgress} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.quizProgress__bar}>
        <div 
          className={styles.quizProgress__fill} 
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      <div className={styles.quizProgress__text}>
        <span className={styles.quizProgress__current}>{currentCategory + 1}</span>
        <span className={styles.quizProgress__separator}> / </span>
        <span className={styles.quizProgress__total}>{totalCategories}</span>
        <span className={styles.quizProgress__percentage}> ({percentage}%)</span>
      </div>
    </div>
  );
}

