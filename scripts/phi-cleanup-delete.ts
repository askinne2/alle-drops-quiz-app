/**
 * Phase 1.C — Delete metafield values
 *
 * Reads the inventory JSON. For each metafield flagged DELETE-PHI or
 * DELETE-LEGACY, calls metafieldsDelete on the Shopify Admin API.
 *
 * Does NOT delete metafield DEFINITIONS — that is Phase 1.D.
 * KEEP set metafields are never touched.
 *
 * Usage:
 *   # Dry-run against the dev test customer first:
 *   npx tsx scripts/phi-cleanup-delete.ts <inventory-json-path> --customer gid://shopify/Customer/6822520881358
 *
 *   # Full run (after confirming dev customer is clean):
 *   npx tsx scripts/phi-cleanup-delete.ts <inventory-json-path>
 *
 * Required env vars:
 *   SHOPIFY_ADMIN_ACCESS_TOKEN
 *   SHOPIFY_SHOP_DOMAIN (optional)
 */

import { readFileSync, writeFileSync } from 'fs';
import { deleteMetafields, KEEP_SET } from './lib/shopify-admin.js';

const inventoryPath = process.argv[2];
if (!inventoryPath) {
  console.error('Usage: npx tsx scripts/phi-cleanup-delete.ts <inventory-json-path> [--customer <gid>]');
  process.exit(1);
}

const singleCustomerArg = (() => {
  const idx = process.argv.indexOf('--customer');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const ISO = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_JSON = `scripts/output/phi-cleanup-delete-${ISO}.json`;

console.log('=== Phase 1.C — Delete metafield values ===\n');
if (singleCustomerArg) {
  console.log(`Mode: SINGLE CUSTOMER — ${singleCustomerArg}`);
} else {
  console.log('Mode: ALL CUSTOMERS');
}
console.log('');

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as {
  customers: Array<{
    customerId: string;
    email: string;
    metafields: Array<{ id: string; namespace: string; key: string; type: string; category: string }>;
  }>;
};

const toProcess = singleCustomerArg
  ? inventory.customers.filter((c) => c.customerId === singleCustomerArg)
  : inventory.customers;

if (singleCustomerArg && toProcess.length === 0) {
  console.error(`Customer ${singleCustomerArg} not found in inventory.`);
  process.exit(1);
}

let totalDeleted = 0;
let totalErrors = 0;
const errorLog: string[] = [];
const deleteLog: Array<{ customerId: string; namespace: string; key: string; success: boolean; error?: string }> = [];

for (const customer of toProcess) {
  const toDelete = customer.metafields
    .filter((m) => m.category !== 'KEEP')
    .filter((m) => !KEEP_SET.has(`${m.namespace}.${m.key}`)); // double guard

  if (toDelete.length === 0) continue;

  console.log(`Customer ${customer.customerId.replace('gid://shopify/Customer/', '')} — deleting ${toDelete.length} metafield(s)`);

  const result = await deleteMetafields(
    toDelete.map((m) => ({ ownerId: customer.customerId, namespace: m.namespace, key: m.key })),
  );

  totalDeleted += result.deleted;
  for (const err of result.errors) {
    totalErrors++;
    const msg = `${customer.customerId} — ${err}`;
    errorLog.push(msg);
    console.error(`  ERROR: ${msg}`);
  }

  for (const mf of toDelete) {
    deleteLog.push({
      customerId: customer.customerId,
      namespace: mf.namespace,
      key: mf.key,
      success: result.errors.length === 0,
      ...(result.errors.length > 0 ? { error: result.errors.join('; ') } : {}),
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: singleCustomerArg ? `single:${singleCustomerArg}` : 'all',
  totals: { deleted: totalDeleted, errors: totalErrors },
  log: deleteLog,
};

writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8');

console.log('');
console.log(`Deleted:  ${totalDeleted}`);
console.log(`Errors:   ${totalErrors}`);
console.log(`Report:   ${OUT_JSON}`);
console.log('');

if (errorLog.length > 0) {
  console.log('Errors encountered:');
  for (const e of errorLog) console.log('  ' + e);
  console.log('');
}

if (singleCustomerArg) {
  console.log('Single-customer run complete.');
  console.log('Verify the customer\'s metafields in Shopify admin, then run without --customer for all customers.');
} else {
  console.log('Full run complete.');
  console.log('Next: npx tsx scripts/phi-cleanup-definitions.ts ' + inventoryPath);
}
