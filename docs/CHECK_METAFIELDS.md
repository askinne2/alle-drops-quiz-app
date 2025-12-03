# How to Check Customer Metafields in Shopify

## Option 1: Via Shopify Admin UI

1. Go to **Customers** → Click on the customer (e.g., `test@example.com`)
2. Scroll down the page - metafields might be in a collapsible section
3. Look for:
   - "Metafields" section
   - "Additional information" section
   - Or check the right sidebar for a "Metafields" card

**Note:** Metafields might not be visible by default. They may need to be enabled in:
- Settings → Custom data → Customer metafields

## Option 2: Via Shopify GraphQL API

You can query metafields directly via GraphQL:

```graphql
query GetCustomerMetafields($customerId: ID!) {
  customer(id: $customerId) {
    id
    email
    metafields(first: 10, namespace: "alledrops") {
      edges {
        node {
          namespace
          key
          value
          type
        }
      }
    }
  }
}
```

## Option 3: Via Admin API (using your Cloudflare Worker credentials)

If you have the Shopify Admin API access token, you can query directly:

```bash
curl -X POST https://aod-dev.myshopify.com/admin/api/2024-01/graphql.json \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: YOUR_ACCESS_TOKEN" \
  -d '{
    "query": "query { customers(first: 1, query: \"email:test@example.com\") { edges { node { id email metafields(first: 10, namespace: \\\"alledrops\\\") { edges { node { namespace key value type } } } } } } }"
  }'
```

## Expected Metafields

After a successful quiz submission, you should see these metafields:
- `alledrops.symptom_profile_id` - The quiz profile ID
- `alledrops.quiz_score` - Numeric score
- `alledrops.quiz_region` - Selected region
- `alledrops.quiz_date` - Date/time of quiz
- `alledrops.severity_level` - Severity level (minimal/mild/moderate/severe)
- `alledrops.quiz_history` - JSON array of all quiz attempts



