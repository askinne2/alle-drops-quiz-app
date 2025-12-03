/**
 * Question Category Component
 * Wrapper for a category of questions
 */

import { type QuizCategory } from "../../lib/quiz/types";
import { QuestionCard } from "./QuestionCard";
import styles from "../../styles/quiz.module.css";

interface QuestionCategoryProps {
  category: QuizCategory;
  responses: Record<string, number>;
  onResponseChange: (questionId: string, value: number) => void;
  isActive: boolean;
  disabled?: boolean;
}

export function QuestionCategory({
  category,
  responses,
  onResponseChange,
  isActive,
  disabled = false,
}: QuestionCategoryProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div className={styles.questionCategory} data-category={category.name}>
      <h2 className={styles.questionCategory__title}>{category.name}</h2>
      <div className={styles.questionCategory__questions}>
        {category.questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            value={responses[question.id]}
            onChange={onResponseChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

