/**
 * Metafields Verification Page
 * Query and display customer metafields to verify they're being set correctly
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId") || url.searchParams.get("email");

  if (!customerId) {
    return { customer: null, error: null };
  }

  try {
    // If customerId is an email, find the customer first
    let customerGid = customerId;
    if (customerId.includes("@")) {
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
        variables: { query: `email:${customerId}` },
      });
      const data = await searchResult.json();
      
      if (data.data?.customers?.edges?.length > 0) {
        customerGid = data.data.customers.edges[0].node.id;
      } else {
        return { customer: null, error: "Customer not found" };
      }
    }

    // Query metafields
    const result = await admin.graphql(CUSTOMER_METAFIELDS_QUERY, {
      variables: { customerId: customerGid },
    });
    
    const metafieldsData = await result.json();
    return { customer: metafieldsData.data?.customer || null, error: null };
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return { 
      customer: null, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
};

export default function VerifyMetafieldsPage() {
  const { customer, error } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customerId") || searchParams.get("email");

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Verify Customer Metafields</h1>
      
      <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f5f5f5", borderRadius: "8px" }}>
        <form method="get" style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label htmlFor="customerId" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
              Customer ID or Email:
            </label>
            <input
              id="customerId"
              name="customerId"
              type="text"
              defaultValue={customerId || ""}
              placeholder="gid://shopify/Customer/123 or test@example.com"
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
        </form>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "#fee", borderRadius: "8px", marginBottom: "1rem", color: "#c00" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {customer && (
        <div>
          <h2>Customer: {customer.email || customer.id}</h2>
          
          {customer.metafields?.edges?.length > 0 ? (
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
                  {customer.metafields.edges.map((edge: any) => {
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
              ⚠️ No metafields found for this customer in the "alledrops" namespace.
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






