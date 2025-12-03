/**
 * Customer operations
 * Migrated from Cloudflare Worker findOrCreateCustomer()
 */

export interface Customer {
  id: string;
  email: string;
}

/**
 * Find or create a customer by email
 * Migrated from Cloudflare Worker findOrCreateCustomer()
 * 
 * @param admin - Shopify Admin API client (from authenticate.admin())
 * @param email - Customer email address
 * @returns Customer object with id and email, or null if creation fails
 */
export async function findOrCreateCustomer(
  admin: { graphql: Function },
  email: string
): Promise<Customer | null> {
  // First, try to find existing customer
  const searchQuery = `
    query findCustomer($email: String!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            id
            email
          }
        }
      }
    }
  `;

  try {
    const searchResponse = await admin.graphql(searchQuery, {
      variables: { email },
    });
    const searchData = await searchResponse.json();

    if (searchData.data?.customers?.edges?.length > 0) {
      return searchData.data.customers.edges[0].node;
    }

    // Customer not found, create new one
    const createMutation = `
      mutation createCustomer($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const createResponse = await admin.graphql(createMutation, {
      variables: {
        input: {
          email: email,
        },
      },
    });
    const createData = await createResponse.json();

    if (createData.data?.customerCreate?.userErrors?.length > 0) {
      console.error("Customer creation errors:", createData.data.customerCreate.userErrors);
      return null;
    }

    return createData.data?.customerCreate?.customer || null;
  } catch (error) {
    console.error("Error in findOrCreateCustomer:", error);
    throw error;
  }
}



