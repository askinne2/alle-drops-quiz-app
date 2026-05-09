import 'dotenv/config';
import { createHash } from 'crypto';

export const SHOP_DOMAIN =
  process.env.SHOPIFY_SHOP_DOMAIN ?? 'allergist-on-demand.myshopify.com';

const API_VERSION = '2024-10';
const GQL_URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

function getToken(): string {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!token) {
    console.error('ERROR: SHOPIFY_ADMIN_ACCESS_TOKEN is not set.');
    console.error(
      'Set it in your environment or pull from Fly: fly secrets list -a alle-drops-quiz-app',
    );
    process.exit(1);
  }
  return token;
}

// Metafields that must never be deleted under any circumstance.
export const KEEP_SET = new Set(['alledrops.last_completed_at', 'alledrops.quiz_count']);

export type MetafieldCategory = 'KEEP' | 'DELETE-PHI' | 'DELETE-LEGACY';

export interface Metafield {
  id: string;
  namespace: string;
  key: string;
  type: string;
}

export interface MetafieldWithValue extends Metafield {
  value: string;
}

export interface Customer {
  id: string;
  email: string;
  metafields: Metafield[];
}

export interface CustomerWithValues {
  id: string;
  email: string;
  metafields: MetafieldWithValue[];
}

export interface CategorizedMetafield extends Metafield {
  category: MetafieldCategory;
}

export interface MetafieldDefinition {
  id: string;
  namespace: string;
  key: string;
  name: string;
  typeName: string;
}

export function categorize(namespace: string, key: string): MetafieldCategory {
  const fullKey = `${namespace}.${key}`;
  if (KEEP_SET.has(fullKey)) return 'KEEP';
  if (namespace === 'alledrops') return 'DELETE-PHI';
  return 'DELETE-LEGACY';
}

export async function shopifyGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getToken(),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? 2);
    await sleep(retryAfter * 1000);
    return shopifyGraphQL<T>(query, variables);
  }

  if (!res.ok) {
    throw new Error(`Shopify API HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

// ── Customer pagination ────────────────────────────────────────────────────

const CUSTOMERS_QUERY = /* graphql */ `
  query GetCustomers($cursor: String) {
    customers(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        email
        metafields(first: 250) {
          nodes { id namespace key type }
        }
      }
    }
  }
`;

interface CustomersPage {
  customers: {
    pageInfo: { hasNextPage: boolean; endCursor: string };
    nodes: Array<{
      id: string;
      email: string;
      metafields: { nodes: Metafield[] };
    }>;
  };
}

export async function* getAllCustomers(): AsyncGenerator<Customer> {
  let cursor: string | null = null;
  do {
    const data: CustomersPage = await shopifyGraphQL<CustomersPage>(CUSTOMERS_QUERY, {
      cursor,
    });
    for (const node of data.customers.nodes) {
      yield { id: node.id, email: node.email, metafields: node.metafields.nodes };
    }
    cursor = data.customers.pageInfo.hasNextPage ? data.customers.pageInfo.endCursor : null;
    if (cursor) await sleep(250);
  } while (cursor !== null);
}

// ── Customer metafields with values (for backup) ──────────────────────────

const CUSTOMER_METAFIELDS_WITH_VALUES_QUERY = /* graphql */ `
  query GetCustomerMetafields($id: ID!) {
    customer(id: $id) {
      metafields(first: 250) {
        nodes { id namespace key type value }
      }
    }
  }
`;

interface CustomerMetafieldsData {
  customer: { metafields: { nodes: MetafieldWithValue[] } } | null;
}

export async function getCustomerMetafieldsWithValues(
  customerId: string,
): Promise<MetafieldWithValue[]> {
  const data = await shopifyGraphQL<CustomerMetafieldsData>(
    CUSTOMER_METAFIELDS_WITH_VALUES_QUERY,
    { id: customerId },
  );
  return data.customer?.metafields.nodes ?? [];
}

// ── Delete metafield values ───────────────────────────────────────────────

const METAFIELDS_DELETE_MUTATION = /* graphql */ `
  mutation DeleteMetafields($metafields: [MetafieldsDeleteInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { key namespace ownerId }
      userErrors { field message }
    }
  }
`;

interface MetafieldsDeleteData {
  metafieldsDelete: {
    deletedMetafields: Array<{ key: string; namespace: string; ownerId: string }>;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

export async function deleteMetafields(
  items: Array<{ ownerId: string; namespace: string; key: string }>,
): Promise<{ deleted: number; errors: string[] }> {
  if (items.length === 0) return { deleted: 0, errors: [] };

  const BATCH = 25;
  let deleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const data = await shopifyGraphQL<MetafieldsDeleteData>(METAFIELDS_DELETE_MUTATION, {
      metafields: batch,
    });
    deleted += data.metafieldsDelete.deletedMetafields.length;
    for (const e of data.metafieldsDelete.userErrors) {
      errors.push(`${e.field.join('.')}: ${e.message}`);
    }
    if (i + BATCH < items.length) await sleep(250);
  }

  return { deleted, errors };
}

// ── Metafield definitions ─────────────────────────────────────────────────

const DEFINITIONS_QUERY = /* graphql */ `
  query GetMetafieldDefinitions($namespace: String, $cursor: String) {
    metafieldDefinitions(
      first: 250
      after: $cursor
      ownerType: CUSTOMER
      namespace: $namespace
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        namespace
        key
        name
        type { name }
      }
    }
  }
`;

interface DefinitionsPage {
  metafieldDefinitions: {
    pageInfo: { hasNextPage: boolean; endCursor: string };
    nodes: Array<{
      id: string;
      namespace: string;
      key: string;
      name: string;
      type: { name: string };
    }>;
  };
}

export async function getMetafieldDefinitions(
  namespace: string | null = null,
): Promise<MetafieldDefinition[]> {
  const defs: MetafieldDefinition[] = [];
  let cursor: string | null = null;
  do {
    const data: DefinitionsPage = await shopifyGraphQL<DefinitionsPage>(DEFINITIONS_QUERY, {
      namespace,
      cursor,
    });
    for (const node of data.metafieldDefinitions.nodes) {
      defs.push({ id: node.id, namespace: node.namespace, key: node.key, name: node.name, typeName: node.type.name });
    }
    cursor = data.metafieldDefinitions.pageInfo.hasNextPage
      ? data.metafieldDefinitions.pageInfo.endCursor
      : null;
    if (cursor) await sleep(250);
  } while (cursor !== null);
  return defs;
}

const DEFINITION_DELETE_MUTATION = /* graphql */ `
  mutation DeleteMetafieldDefinition($id: ID!, $deleteAllAssociatedMetafields: Boolean!) {
    metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields) {
      deletedDefinitionId
      userErrors { field message }
    }
  }
`;

interface DefinitionDeleteData {
  metafieldDefinitionDelete: {
    deletedDefinitionId: string | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

export async function deleteMetafieldDefinition(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const data = await shopifyGraphQL<DefinitionDeleteData>(DEFINITION_DELETE_MUTATION, {
    id,
    deleteAllAssociatedMetafields: true,
  });
  const errors = data.metafieldDefinitionDelete.userErrors;
  if (errors.length > 0) {
    return { ok: false, error: errors.map((e) => e.message).join('; ') };
  }
  return { ok: true };
}
