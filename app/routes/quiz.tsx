/**
 * Public Quiz Route
 * Accessible without authentication - for embedding in theme blocks
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { QuizContainer } from "../components/quiz/QuizContainer";
import {
  getHardcodedQuestions,
  groupQuestionsByCategory,
} from "../lib/quiz/questions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // No authentication required - this is a public route
  // Load quiz questions
  const questions = getHardcodedQuestions();
  const categories = groupQuestionsByCategory(questions);

  return { categories };
};

export default function PublicQuizPage() {
  const { categories } = useLoaderData<typeof loader>();
  
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <QuizContainer categories={categories} />
    </div>
  );
}



