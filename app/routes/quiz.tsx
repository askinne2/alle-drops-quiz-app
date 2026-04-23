/**
 * Public Quiz Route
 * Accessible without authentication - for embedding in theme blocks
 */

import type { LoaderFunctionArgs } from "react-router";
import { QuizContainer } from "../components/quiz/QuizContainer";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  void request;
  return {};
};

export default function PublicQuizPage() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <QuizContainer />
    </div>
  );
}
