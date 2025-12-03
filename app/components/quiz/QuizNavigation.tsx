/**
 * Quiz Navigation Component
 * Previous/Next buttons and Submit button
 */

import styles from "../../styles/quiz.module.css";

interface QuizNavigationProps {
  currentCategory: number;
  totalCategories: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  canSubmit: boolean;
  isSubmitting?: boolean;
}

export function QuizNavigation({
  currentCategory,
  totalCategories,
  onPrevious,
  onNext,
  onSubmit,
  canGoPrevious,
  canGoNext,
  canSubmit,
  isSubmitting = false,
}: QuizNavigationProps) {
  const isLastCategory = currentCategory === totalCategories - 1;

  return (
    <div className={styles.quizNavigation}>
      <div className={styles.quizNavigation__buttons}>
        {canGoPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            disabled={isSubmitting}
            className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
            aria-label="Previous category"
          >
            ← Previous
          </button>
        )}

        {!isLastCategory && canGoNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
            aria-label="Next category"
          >
            Next →
          </button>
        )}

        {isLastCategory && canSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonSubmit}`}
            aria-label="Submit quiz"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </button>
        )}
      </div>
    </div>
  );
}

