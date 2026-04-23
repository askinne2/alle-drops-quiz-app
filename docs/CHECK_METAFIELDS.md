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
| Key | Type | Notes |
|-----|------|-------|
| `alledrops.symptom_profile_id` | `single_line_text_field` | Quiz profile ID such as `AOD_1764505955675` |
| `alledrops.quiz_score` | `number_integer` | Numeric total score used to derive the bracket |
| `alledrops.state` | `single_line_text_field` | `tennessee` or `texas` |
| `alledrops.score_bracket` | `single_line_text_field` | `0-2`, `3-6`, or `7+` |
| `alledrops.quiz_date` | `date_time` | ISO timestamp of the submission |
| `alledrops.quiz_history` | `json` | Array of attempts using `profile_id`, `date`, `score`, `score_bracket`, and `state` |

Legacy customers may still have `alledrops.quiz_region` and `alledrops.severity_level` from the retired region/severity flow.






