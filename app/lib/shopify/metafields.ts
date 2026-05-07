/**
 * Shopify customer metafield operations — NON-PHI ONLY.
 *
 * HIPAA: This file must never write health information, identifiers tied
 * to health data, or any field that — combined with the customer record —
 * would constitute PHI. Score, score_bracket, state, quiz_history, and
 * symptom_profile_id are all PHI when attached to an identifiable customer
 * and have been removed.
 *
 * What lives here now:
 *   alledrops.last_completed_at  (date_time) — when the patient most recently completed
 *   alledrops.quiz_count         (number_integer) — total completed assessments
 *
 * Everything else (PHI) is in Cloud SQL via app/lib/submissions.ts.
 */

interface AdminLike {
  graphql: (query: string, opts?: { variables?: Record<string, unknown> }) => Promise<{
    json: () => Promise<unknown>;
  }>;
}

const NAMESPACE = "alledrops";
const KEY_LAST_COMPLETED = "last_completed_at";
const KEY_QUIZ_COUNT = "quiz_count";

/**
 * Read a single customer metafield value. Generic helper, used for the count read.
 */
export async function getCustomerMetafield(
  admin: AdminLike,
  customerId: string,
  namespace: string,
  key: string
): Promise<string | null> {
  const query = `
    query getCustomerMetafield($customerId: ID!, $namespace: String!, $key: String!) {
      customer(id: $customerId) {
        metafield(namespace: $namespace, key: $key) {
          value
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(query, {
      variables: { customerId, namespace, key },
    });
    const data = (await response.json()) as {
      data?: { customer?: { metafield?: { value?: string } } };
    };
    return data.data?.customer?.metafield?.value ?? null;
  } catch (error) {
    console.error("[metafields] read failed:", error);
    return null;
  }
}

/**
 * Update non-PHI quiz tracking metafields after a successful submission.
 * Only writes last_completed_at and quiz_count. No health information.
 */
export async function updateNonPhiQuizMetafields(
  admin: AdminLike,
  customerId: string,
  completedAt: Date = new Date()
): Promise<{ success: boolean; quizCount?: number; error?: string }> {
  // Read current count so we can increment it.
  const existingCountStr = await getCustomerMetafield(
    admin,
    customerId,
    NAMESPACE,
    KEY_QUIZ_COUNT
  );
  const existingCount = Number(existingCountStr) || 0;
  const newCount = existingCount + 1;

  const mutation = `
    mutation setCustomerMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key value }
        userErrors { field message }
      }
    }
  `;

  const metafields = [
    {
      ownerId: customerId,
      namespace: NAMESPACE,
      key: KEY_LAST_COMPLETED,
      type: "date_time",
      value: completedAt.toISOString(),
    },
    {
      ownerId: customerId,
      namespace: NAMESPACE,
      key: KEY_QUIZ_COUNT,
      type: "number_integer",
      value: newCount.toString(),
    },
  ];

  try {
    const response = await admin.graphql(mutation, { variables: { metafields } });
    const data = (await response.json()) as {
      data?: {
        metafieldsSet?: {
          userErrors?: Array<{ field: string; message: string }>;
        };
      };
    };

    const userErrors = data.data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.error("[metafields] write errors:", userErrors);
      return {
        success: false,
        error: userErrors.map((e) => `${e.field}: ${e.message}`).join("; "),
      };
    }

    return { success: true, quizCount: newCount };
  } catch (error) {
    console.error("[metafields] write failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
