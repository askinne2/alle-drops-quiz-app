/**
 * Error Reporting smoke test (embedded admin only).
 *
 * Opening /app/error-reporting-test inside the Shopify admin throws a synthetic error so a deploy
 * can be checked end to end: handleError -> structured stderr -> Cloud Logging -> Error Reporting
 * (and its email notification). Requires an authenticated admin session; touches no data.
 */
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  throw new Error("Error Reporting smoke test: synthetic error from /app/error-reporting-test (safe to ignore)");
};

export default function ErrorReportingTest() {
  return null;
}
