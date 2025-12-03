/**
 * Metafield operations
 * Migrated from Cloudflare Worker updateCustomerMetafields() and getCustomerMetafield()
 */

export interface QuizMetafieldData {
  symptom_profile_id: string;
  quiz_score: number;
  quiz_region: string;
  severity_level: string;
  quiz_date?: string;
}

export interface QuizHistoryEntry {
  profile_id: string;
  date: string;
  score: number;
  severity: string;
  region: string;
}

/**
 * Get a customer metafield value
 * Migrated from Cloudflare Worker getCustomerMetafield()
 * 
 * @param admin - Shopify Admin API client
 * @param customerId - Shopify customer GID
 * @param namespace - Metafield namespace (e.g., 'alledrops')
 * @param key - Metafield key (e.g., 'quiz_history')
 * @returns Metafield value as JSON string or null
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
 * Migrated from Cloudflare Worker updateCustomerMetafields()
 * 
 * @param admin - Shopify Admin API client
 * @param customerId - Shopify customer GID
 * @param data - Quiz data to store
 * @param existingHistoryJson - Existing quiz_history JSON string (optional)
 * @returns Success status and history count
 */
export async function updateCustomerMetafields(
  admin: { graphql: Function },
  customerId: string,
  data: QuizMetafieldData,
  existingHistoryJson?: string | null
): Promise<{ success: boolean; error?: string; historyCount?: number; details?: any }> {
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

  // Parse existing quiz history or create empty array
  let quizHistory: QuizHistoryEntry[] = [];
  if (existingHistoryJson) {
    try {
      const parsed = JSON.parse(existingHistoryJson);
      if (Array.isArray(parsed)) {
        quizHistory = parsed;
      }
    } catch (e) {
      console.warn("Failed to parse existing quiz history, starting fresh");
      quizHistory = [];
    }
  }

  // Add new quiz entry to history (store minimal data - full data is in Google Sheets)
  const quizEntry: QuizHistoryEntry = {
    profile_id: data.symptom_profile_id,
    date: data.quiz_date || new Date().toISOString(),
    score: data.quiz_score,
    severity: data.severity_level,
    region: data.quiz_region,
  };

  // Add to beginning of array (most recent first)
  quizHistory.unshift(quizEntry);

  // Limit history to last 50 quizzes to prevent metafield size issues
  if (quizHistory.length > 50) {
    quizHistory = quizHistory.slice(0, 50);
  }

  const metafields = [
    // Latest quiz data (for quick access)
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
      key: "quiz_region",
      type: "single_line_text_field",
      value: data.quiz_region,
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
      key: "severity_level",
      type: "single_line_text_field",
      value: data.severity_level,
    },
    // Quiz history (array of quiz references)
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



