/**
 * Quiz Results Admin Page — DEFERRED TO PHASE 2.
 *
 * The previous implementation read PHI (score, state, history) from Shopify
 * customer metafields. Per the MVP plan (aod-mvp-plan.md):
 *   - PHI no longer lives in Shopify metafields.
 *   - Provider/admin view of submissions is Phase 2 work, sourced from Cloud SQL.
 *   - For MVP, providers use a CSV export from Cloud SQL.
 *
 * Keeping this file as a placeholder so the route still resolves inside the
 * embedded admin shell. When Phase 2 begins, replace with a real loader that
 * calls into app/lib/submissions.ts (Cloud SQL).
 */

import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Still authenticate so the embedded shell renders correctly.
  await authenticate.admin(request);
  return { phase: "2" as const };
};

export default function QuizResultsPage() {
  const { phase } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Quiz Results">
      <s-section>
        <s-box padding="large" background="subdued" borderRadius="base">
          <s-heading>Coming in Phase {phase}</s-heading>
          <s-paragraph>
            Provider review of patient assessments is part of the Phase 2 build.
            Submissions are stored in Cloud SQL (HIPAA-compliant) and are
            available via CSV export until this view is ready.
          </s-paragraph>
          <s-paragraph>
            Reach out to engineering for an export of submissions for the
            current period.
          </s-paragraph>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
