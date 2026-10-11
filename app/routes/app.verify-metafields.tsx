/**
 * Metafields Verification Page
 * Query and display customer metafields to verify they're being set correctly
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData } from "react-router";
import { authenticate } from "../shopify.server";

/*
 * PHI note (#46): the lookup value can be a patient email, so it must never
 * travel in the URL (Cloud Run logs the full request line). The lookup is a
 * POST `action`; the value lives in the form body only. The loader reads no
 * query parameters, and nothing here redirects with the value in the URL.
 */
const CUSTOMER_METAFIELDS_QUERY = `
  query GetCustomerMetafields($customerId: ID!) {
    customer(id: $customerId) {
      id
      email
      metafields(first: 10, namespace: "alledrops") {
        edges {
          node {
            id
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

type MetafieldNode = {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
};

type CustomerWithMetafields = {
  id: string;
  email: string | null;
  metafields: { edges: Array<{ node: MetafieldNode }> } | null;
};

type LookupResult = {
  customer: CustomerWithMetafields | null;
  error: string | null;
  lookup: string;
};

/** Normalize a numeric Shopify customer ID or a Customer GID to a GID. */
export function toCustomerGid(value: string): string | null {
  if (/^\d+$/.test(value)) return `gid://shopify/Customer/${value}`;
  if (/^gid:\/\/shopify\/Customer\/\d+$/.test(value)) return value;
  return null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  // Deliberately reads no searchParams: the lookup value is POST-only.
  return null;
};

export const action = async ({ request }: ActionFunctionArgs): Promise<LookupResult> => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const raw = formData.get("lookup");
  const lookup = typeof raw === "string" ? raw.trim() : "";

  if (!lookup) {
    return { customer: null, error: "Enter a customer ID or email.", lookup: "" };
  }

  try {
    let customerGid: string | null;
    if (lookup.includes("@")) {
      const searchQuery = `
        query FindCustomerByEmail($query: String!) {
          customers(first: 1, query: $query) {
            edges {
              node {
                id
                email
              }
            }
          }
        }
      `;
      const searchResult = await admin.graphql(searchQuery, {
        variables: { query: `email:${JSON.stringify(lookup)}` },
      });
      const data = await searchResult.json();
      customerGid = data.data?.customers?.edges?.[0]?.node?.id ?? null;
      if (!customerGid) {
        return { customer: null, error: "Customer not found", lookup };
      }
    } else {
      customerGid = toCustomerGid(lookup);
      if (!customerGid) {
        return {
          customer: null,
          error: "Enter a numeric customer ID, a gid://shopify/Customer/... ID, or an email.",
          lookup,
        };
      }
    }

    const result = await admin.graphql(CUSTOMER_METAFIELDS_QUERY, {
      variables: { customerId: customerGid },
    });
    const metafieldsData = await result.json();
    const customer = metafieldsData.data?.customer || null;
    return { customer, error: customer ? null : "Customer not found", lookup };
  } catch (error) {
    // Log the error name only; never the object or message (either can echo
    // request variables, i.e. the email being looked up).
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error("Error fetching metafields:", name);
    return { customer: null, error: "Failed to fetch metafields", lookup };
  }
};

export default function VerifyMetafieldsPage() {
  const actionData = useActionData<typeof action>();
  const customer = actionData?.customer ?? null;
  const error = actionData?.error ?? null;
  const lookup = actionData?.lookup ?? "";

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Verify Customer Metafields</h1>
      
      <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f5f5f5", borderRadius: "8px" }}>
        <Form method="post" style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label htmlFor="lookup" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
              Customer ID or Email:
            </label>
            <input
              id="lookup"
              name="lookup"
              type="text"
              autoComplete="off"
              defaultValue={lookup}
              placeholder="6942938497230, gid://shopify/Customer/123, or email"
              style={{ padding: "0.5rem", fontSize: "1rem", width: "300px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "1rem",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Query Metafields
          </button>
        </Form>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "#fee", borderRadius: "8px", marginBottom: "1rem", color: "#c00" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {customer && (
        <div>
          <h2>Customer: {customer.email || customer.id}</h2>
          
          {customer.metafields && customer.metafields.edges.length > 0 ? (
            <div>
              <h3>Metafields (namespace: alledrops)</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #ddd" }}>Key</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #ddd" }}>Type</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #ddd" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.metafields.edges.map((edge) => {
                    let displayValue = edge.node.value;
                    // Pretty print JSON values
                    if (edge.node.type === "json" || edge.node.key === "quiz_history") {
                      try {
                        displayValue = JSON.stringify(JSON.parse(edge.node.value), null, 2);
                      } catch {
                        displayValue = edge.node.value;
                      }
                    }
                    
                    return (
                      <tr key={edge.node.id}>
                        <td style={{ padding: "0.75rem", border: "1px solid #ddd", fontWeight: 600 }}>
                          {edge.node.key}
                        </td>
                        <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>
                          {edge.node.type}
                        </td>
                        <td style={{ padding: "0.75rem", border: "1px solid #ddd", fontFamily: "monospace", whiteSpace: "pre-wrap", maxWidth: "500px", overflow: "auto" }}>
                          {displayValue}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "1rem", background: "#fff3cd", borderRadius: "8px", marginTop: "1rem" }}>
              ⚠️ No metafields found for this customer in the &quot;alledrops&quot; namespace.
            </div>
          )}
        </div>
      )}

      {!customer && !error && (
        <div style={{ padding: "1rem", background: "#e7f3ff", borderRadius: "8px", marginTop: "1rem" }}>
          Enter a Customer ID (e.g., <code>gid://shopify/Customer/6942938497230</code>) or email address above to verify metafields.
        </div>
      )}
    </div>
  );
}






