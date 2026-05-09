/**
 * Phase 1.B — Backup before delete
 *
 * Reads the inventory JSON produced by Phase 1.A. For each metafield flagged
 * for deletion, fetches the current value. Writes a gzipped backup + SHA256.
 *
 * Usage:
 *   npx tsx scripts/phi-cleanup-backup.ts <inventory-json-path>
 *
 * Required env vars:
 *   SHOPIFY_ADMIN_ACCESS_TOKEN
 *   SHOPIFY_SHOP_DOMAIN (optional)
 */

import { readFileSync, writeFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { getCustomerMetafieldsWithValues, categorize, sha256 } from './lib/shopify-admin.js';

const inventoryPath = process.argv[2];
if (!inventoryPath) {
  console.error('Usage: npx tsx scripts/phi-cleanup-backup.ts <inventory-json-path>');
  process.exit(1);
}

const ISO = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_GZ = `scripts/output/phi-backup-${ISO}.json.gz`;
const OUT_SHA = `scripts/output/phi-backup-${ISO}.sha256.txt`;

console.log('=== Phase 1.B — Backup before delete ===\n');

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as {
  customers: Array<{
    customerId: string;
    email: string;
    metafields: Array<{ id: string; namespace: string; key: string; type: string; category: string }>;
  }>;
};

const customersToBackup = inventory.customers.filter((c) =>
  c.metafields.some((m) => m.category !== 'KEEP'),
);

console.log(`Customers to back up: ${customersToBackup.length}`);

const backup: Array<{
  customerId: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  category: string;
}> = [];

process.stdout.write('Fetching values');

for (const customer of customersToBackup) {
  process.stdout.write('.');
  const liveMetafields = await getCustomerMetafieldsWithValues(customer.customerId);

  for (const mf of liveMetafields) {
    const cat = categorize(mf.namespace, mf.key);
    if (cat === 'KEEP') continue;
    backup.push({
      customerId: customer.customerId,
      namespace: mf.namespace,
      key: mf.key,
      type: mf.type,
      value: mf.value,
      category: cat,
    });
  }
}

console.log('\n');

if (backup.length === 0) {
  console.log('No values to back up — all metafields to delete have no live values.');
  console.log('Safe to proceed to Phase 1.C.');
  process.exit(0);
}

const jsonBytes = Buffer.from(JSON.stringify(backup, null, 2), 'utf8');
const compressed = gzipSync(jsonBytes);
const checksum = sha256(compressed);

writeFileSync(OUT_GZ, compressed);
writeFileSync(OUT_SHA, `${checksum}  ${OUT_GZ}\n`, 'utf8');

console.log(`Backup written:  ${OUT_GZ}`);
console.log(`SHA256:          ${OUT_SHA}`);
console.log(`Fields backed up: ${backup.length}`);
console.log('');
console.log('⚠  STOP. Before proceeding to Phase 1.C:');
console.log('   1. Copy the .gz file to a secure location (encrypted drive / password manager).');
console.log('   2. Confirm Andrew has acknowledged the backup is stored.');
console.log('   3. Then run: npx tsx scripts/phi-cleanup-delete.ts ' + inventoryPath);
