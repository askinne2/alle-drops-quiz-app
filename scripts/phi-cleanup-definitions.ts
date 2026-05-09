/**
 * Phase 1.D — Drop metafield definitions
 *
 * Lists customer metafield definitions in the alledrops namespace and any
 * other namespace found in the inventory that had DELETE-LEGACY fields.
 * Deletes definitions that are NOT in the KEEP set.
 *
 * deleteAllAssociatedMetafields is set to true as a safety net.
 *
 * Usage:
 *   npx tsx scripts/phi-cleanup-definitions.ts <inventory-json-path>
 *
 * Required env vars:
 *   SHOPIFY_ADMIN_ACCESS_TOKEN
 *   SHOPIFY_SHOP_DOMAIN (optional)
 */

import { readFileSync } from 'fs';
import {
  getMetafieldDefinitions,
  deleteMetafieldDefinition,
  categorize,
  KEEP_SET,
} from './lib/shopify-admin.js';

const inventoryPath = process.argv[2];
if (!inventoryPath) {
  console.error('Usage: npx tsx scripts/phi-cleanup-definitions.ts <inventory-json-path>');
  process.exit(1);
}

console.log('=== Phase 1.D — Drop metafield definitions ===\n');

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as {
  namespacesFound: string[];
};

const namespacesToScan = [...new Set(['alledrops', ...inventory.namespacesFound])];
console.log(`Namespaces to scan: ${namespacesToScan.join(', ')}\n`);

let deletedCount = 0;
let errorCount = 0;

for (const ns of namespacesToScan) {
  const defs = await getMetafieldDefinitions(ns);
  if (defs.length === 0) {
    console.log(`  ${ns}: no definitions found`);
    continue;
  }

  for (const def of defs) {
    const cat = categorize(def.namespace, def.key);
    const fullKey = `${def.namespace}.${def.key}`;

    if (cat === 'KEEP' || KEEP_SET.has(fullKey)) {
      console.log(`  KEEP  ${fullKey} — skipping`);
      continue;
    }

    process.stdout.write(`  DELETE ${fullKey} (${def.typeName}) — `);
    const result = await deleteMetafieldDefinition(def.id);
    if (result.ok) {
      console.log('deleted');
      deletedCount++;
    } else {
      console.log(`ERROR: ${result.error}`);
      errorCount++;
    }
  }
}

console.log('');
console.log(`Definitions deleted: ${deletedCount}`);
console.log(`Errors:              ${errorCount}`);
console.log('');
console.log('Next: npx tsx scripts/phi-cleanup-verify.ts');
