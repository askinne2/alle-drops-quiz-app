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
            <s-text fontWeight="bold">POST /api/quiz/submit</s-text> - Submit quiz results
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="App Features">
        <s-unordered-list>
          <s-list-item>35 clinical questions across 5 symptom categories</s-list-item>
          <s-list-item>Smart scoring algorithm (0-60 points)</s-list-item>
          <s-list-item>Severity classification (minimal/mild/moderate/severe)</s-list-item>
          <s-list-item>Regional product matching (7 US regions)</s-list-item>
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
