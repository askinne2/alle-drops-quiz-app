/**
 * Quiz Page Route
 * Displays the symptom assessment quiz
 */

import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { QuizContainer } from "../components/quiz/QuizContainer";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return {};
};

export default function QuizPage() {
  return (
    <s-page heading="Symptom Assessment Quiz">
      <s-section>
        <QuizContainer />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
