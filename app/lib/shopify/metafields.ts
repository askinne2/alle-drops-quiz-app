/**
 * Metafield operations
 * Migrated from Cloudflare Worker updateCustomerMetafields() and getCustomerMetafield()
 */

export interface QuizMetafieldData {
  symptom_profile_id: string;
  quiz_score: number;
  state: string;
  score_bracket: string;
  quiz_date?: string;
}

export interface QuizHistoryEntry {
  profile_id: string;
  date: string;
  score: number;
  score_bracket: string;
  state: string;
}

/**
 * Get a customer metafield value
 * Migrated from Cloudflare Worker getCustomerMetafield()
 */
export async function getCustomerMetafield(
  admin: { graphql: Function },
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
      variables: {
        customerId: customerId,
        namespace: namespace,
        key: key,
      },
    });
    const data = await response.json();

    return data.data?.customer?.metafield?.value || null;
  } catch (error) {
    console.error("Error fetching metafield:", error);
    return null;
  }
}

/**
 * Update customer metafields with quiz data
 */
export async function updateCustomerMetafields(
  admin: { graphql: Function },
  customerId: string,
  data: QuizMetafieldData,
  existingHistoryJson?: string | null
): Promise<{ success: boolean; error?: string; historyCount?: number; details?: unknown }> {
  const mutation = `
    mutation setCustomerMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  let quizHistory: QuizHistoryEntry[] = [];
  if (existingHistoryJson) {
    try {
      const parsed = JSON.parse(existingHistoryJson);
      if (Array.isArray(parsed)) {
        quizHistory = parsed.map((entry: Record<string, unknown>) => ({
          profile_id: String(entry.profile_id ?? ""),
          date: String(entry.date ?? ""),
          score: Number(entry.score ?? 0),
          score_bracket: String(entry.score_bracket ?? entry.severity ?? ""),
          state: String(entry.state ?? entry.region ?? ""),
        }));
      }
    } catch {
      quizHistory = [];
    }
  }

  const quizEntry: QuizHistoryEntry = {
    profile_id: data.symptom_profile_id,
    date: data.quiz_date || new Date().toISOString(),
    score: data.quiz_score,
    score_bracket: data.score_bracket,
    state: data.state,
  };

  quizHistory.unshift(quizEntry);

  if (quizHistory.length > 50) {
    quizHistory = quizHistory.slice(0, 50);
  }

  const metafields = [
    {
      ownerId: customerId,
      namespace: "alledrops",
      key: "symptom_profile_id",
      type: "single_line_text_field",
      value: data.symptom_profile_id,
    },
    {
      ownerId: customerId,
      namespace: "alledrops",
      key: "quiz_score",
      type: "number_integer",
      value: data.quiz_score.toString(),
    },
    {
      ownerId: customerId,
      namespace: "alledrops",
      key: "state",
      type: "single_line_text_field",
      value: data.state,
    },
    {
      ownerId: customerId,
      namespace: "alledrops",
      key: "quiz_date",
      type: "date_time",
      value: data.quiz_date || new Date().toISOString(),
    },
    {
      ownerId: customerId,
      namespace: "alledrops",
      key: "score_bracket",
      type: "single_line_text_field",
      value: data.score_bracket,
    },
    {
      ownerId: customerId,
      namespace: "alledrops",
      key: "quiz_history",
      type: "json",
      value: JSON.stringify(quizHistory),
    },
  ];

  try {
    const response = await admin.graphql(mutation, {
      variables: { metafields },
    });
    const responseData = await response.json();

    if (responseData.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error("Metafield update errors:", responseData.data.metafieldsSet.userErrors);
      return {
        success: false,
        error: "Failed to update metafields",
        details: responseData.data.metafieldsSet.userErrors,
      };
    }

    return {
      success: true,
      historyCount: quizHistory.length,
    };
  } catch (error) {
    console.error("Error updating metafields:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
