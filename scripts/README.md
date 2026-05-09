# PHI Metafield Cleanup Runbook

Removes legacy PHI from Shopify customer metafields on `allergist-on-demand.myshopify.com`.
All PHI values and definitions are deleted except for the two allowed non-PHI flags.

**Keep set (never deleted):**
- `alledrops.last_completed_at`
- `alledrops.quiz_count`

---

## Prerequisites

Set the Admin API token before running any script:

```bash
export SHOPIFY_ADMIN_ACCESS_TOKEN=<token from Fly secrets or password manager>
export SHOPIFY_SHOP_DOMAIN=allergist-on-demand.myshopify.com  # optional — this is the default
```

The token is stored in Fly secrets as `SHOPIFY_ADMIN_ACCESS_TOKEN`. To retrieve it, check your
password manager (the token was set when the app was first configured).

Alternatively, run scripts inside the Fly app where secrets are already injected:

```bash
fly ssh console -a alle-drops-quiz-app
cd /app
npx tsx scripts/phi-cleanup-inventory.ts
```

---

## Step-by-step

### Phase 1.A — Inventory (read-only, safe to run any time)

```bash
npx tsx scripts/phi-cleanup-inventory.ts
```

Outputs:
- `scripts/output/phi-inventory-<timestamp>.json` — full report with metafield GIDs
- `scripts/output/phi-inventory-summary-<timestamp>.md` — human-readable, counts only

**Review the Markdown summary.** Confirm the counts look reasonable before continuing.
Note the JSON path — you'll pass it to every subsequent script.

---

### Phase 1.B — Backup

```bash
npx tsx scripts/phi-cleanup-backup.ts scripts/output/phi-inventory-<timestamp>.json
```

Outputs:
- `scripts/output/phi-backup-<timestamp>.json.gz` — gzipped backup of all values to be deleted
- `scripts/output/phi-backup-<timestamp>.sha256.txt` — checksum

**STOP.** Copy the `.gz` file to a secure location (encrypted drive, secure password manager
attachment). Confirm the backup is safely stored before running Phase 1.C.

The `scripts/output/` directory is in `.gitignore` — these files contain PHI and must never
be committed.

---

### Phase 1.C — Delete values

Run against the dev test customer first:

```bash
npx tsx scripts/phi-cleanup-delete.ts scripts/output/phi-inventory-<timestamp>.json \
  --customer gid://shopify/Customer/6822520881358
```

Verify in Shopify admin that the customer (`askinne2@gmail.com`) now shows only
`last_completed_at` and `quiz_count` under Settings → Custom data → Customers.

Then run against all customers:

```bash
npx tsx scripts/phi-cleanup-delete.ts scripts/output/phi-inventory-<timestamp>.json
```

Outputs `scripts/output/phi-cleanup-delete-<timestamp>.json` with counts only (no PHI).

---

### Phase 1.D — Drop definitions

```bash
npx tsx scripts/phi-cleanup-definitions.ts scripts/output/phi-inventory-<timestamp>.json
```

Removes metafield definitions that would allow PHI to be re-populated in the future.
Uses `deleteAllAssociatedMetafields: true` as a safety net.

---

### Phase 1.E — Verify

```bash
npx tsx scripts/phi-cleanup-verify.ts
```

Exit code 0 = clean. Exit code 1 = issues remain (output lists what's left).

This script is safe to run any time as an ongoing audit check.

---

## What each script does NOT do

- No mutations in Phase 1.A (inventory)
- Phase 1.C does not delete definitions (only values)
- Phase 1.D does not touch the KEEP set under any condition
- No script logs PHI values — IDs and counts only in all reports

## Troubleshooting

**Rate limit errors:** The scripts automatically retry on 429. If you see persistent errors,
add `sleep 2` between runs.

**"Metafield not found" userErrors in Phase 1.C:** This is idempotent — the metafield was
already deleted (possibly by a previous partial run). Not an error.

**Cloud SQL authorized network:** The cleanup scripts hit Shopify's Admin API only (HTTPS).
They do not connect to Cloud SQL. No allowlist changes needed.
