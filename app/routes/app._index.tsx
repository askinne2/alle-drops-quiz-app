/**
 * AlleDrops Quiz App - Home Page
 */

import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="AlleDrops Quiz App">
      <s-section heading="Welcome to AlleDrops Quiz App 🎉">
        <s-paragraph>
          Manage customer symptom assessments, view quiz results, and help customers find the right allergy products for their region.
        </s-paragraph>
      </s-section>

      <s-section heading="Quick Actions">
        <s-stack direction="inline" gap="base">
          <Link to="/app/quiz">
            <s-button variant="primary">📝 Take Quiz (Test)</s-button>
          </Link>
          <Link to="/app/quiz-results">
            <s-button>📊 View Quiz Results</s-button>
          </Link>
        </s-stack>
      </s-section>

      <s-section heading="API Endpoints">
        <s-paragraph>
          The following API endpoints are available for quiz functionality:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>POST /api/quiz/submit</strong> — Submit quiz results
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="App Features">
        <s-unordered-list>
          <s-list-item>Clinical questionnaire (TN/TX patients)</s-list-item>
          <s-list-item>Multi-type scoring with outcome brackets (0–2, 3–6, 7+)</s-list-item>
          <s-list-item>State-specific product paths</s-list-item>
          <s-list-item>Customer metafield storage</s-list-item>
          <s-list-item>Google Sheets integration (optional)</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Documentation">
        <s-paragraph>
          For setup instructions and API documentation, see the project README.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
