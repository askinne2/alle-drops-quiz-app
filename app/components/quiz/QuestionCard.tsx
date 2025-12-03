/**
 * Question Card Component
 * Displays a single quiz question with severity input (0-3)
 */

import { type QuizQuestion } from "../../lib/quiz/types";
import styles from "../../styles/quiz.module.css";

interface QuestionCardProps {
  question: QuizQuestion;
  value: number | undefined;
  onChange: (questionId: string, value: number) => void;
  disabled?: boolean;
}

const SEVERITY_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "Mild" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Severe" },
] as const;

export function QuestionCard({ question, value, onChange, disabled = false }: QuestionCardProps) {
  const handleChange = (newValue: number) => {
    if (!disabled) {
      onChange(question.id, newValue);
    }
  };

  return (
    <div className={styles.questionCard}>
      <label className={styles.questionCard__label} htmlFor={`question-${question.id}`}>
        {question.text}
      </label>
      <div className={styles.questionCard__options} role="radiogroup" aria-labelledby={`question-${question.id}`}>
        {SEVERITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`${styles.questionCard__option} ${value === option.value ? styles.questionCard__optionSelected : ""}`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.value}
              checked={value === option.value}
              onChange={() => handleChange(option.value)}
              disabled={disabled}
              className={styles.questionCard__input}
              aria-label={`${question.text}: ${option.label}`}
            />
            <span className={styles.questionCard__optionLabel}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

