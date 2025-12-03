/**
 * Quiz Page Route
 * Displays the symptom assessment quiz
 */

import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { QuizContainer } from "../components/quiz/QuizContainer";
import {
  getHardcodedQuestions,
  groupQuestionsByCategory,
} from "../lib/quiz/questions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  // Load quiz questions
  const questions = getHardcodedQuestions();
  const categories = groupQuestionsByCategory(questions);

  return { categories };
};

export default function QuizPage() {
  const { categories } = useLoaderData<typeof loader>();
  
  return (
    <s-page heading="Symptom Assessment Quiz">
      <s-section>
        <QuizContainer categories={categories} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

