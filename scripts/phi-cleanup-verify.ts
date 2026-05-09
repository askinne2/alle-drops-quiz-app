/**
 * Phase 1.E — Verify
 *
 * Re-runs the same scan as Phase 1.A. Confirms zero metafields exist outside
 * the KEEP set. Confirms zero PHI metafield definitions exist.
 *
 * Exit code 0 if clean, 1 if anything remains.
 * Safe to run weekly as an ongoing audit.
 *
 * Usage:
 *   npx tsx scripts/phi-cleanup-verify.ts
 *
 * Required env vars:
 *   SHOPIFY_ADMIN_ACCESS_TOKEN
 *   SHOPIFY_SHOP_DOMAIN (optional)
 */

import { getAllCustomers, categorize, getMetafieldDefinitions, KEEP_SET } from './lib/shopify-admin.js';

console.log('=== Phase 1.E — Verify PHI metafield cleanup ===\n');

let phiValuesFound = 0;
let legacyValuesFound = 0;
const findings: string[] = [];

process.stdout.write('Scanning customers');

for await (const customer of getAllCustomers()) {
  process.stdout.write('.');
  for (const mf of customer.metafields) {
    const cat = categorize(mf.namespace, mf.key);
    if (cat === 'DELETE-PHI') {
      phiValuesFound++;
      findings.push(`FAIL PHI VALUE  customer:${customer.id.replace('gid://shopify/Customer/', '')} ${mf.namespace}.${mf.key}`);
    } else if (cat === 'DELETE-LEGACY') {
      legacyValuesFound++;
      findings.push(`FAIL LEGACY VALUE  customer:${customer.id.replace('gid://shopify/Customer/', '')} ${mf.namespace}.${mf.key}`);
    }
  }
}

console.log('\n');

// Check definitions
let phiDefsFound = 0;
const namespaces = ['alledrops'];
for (const ns of namespaces) {
  const defs = await getMetafieldDefinitions(ns);
  for (const def of defs) {
    const fullKey = `${def.namespace}.${def.key}`;
    if (!KEEP_SET.has(fullKey)) {
      phiDefsFound++;
      findings.push(`FAIL PHI DEFINITION  ${fullKey} (${def.typeName})`);
    }
  }
}

if (findings.length === 0) {
  console.log('✓ CLEAN — No PHI metafields or definitions found outside the KEEP set.');
  console.log(`  Keep set present and accounted for: ${[...KEEP_SET].join(', ')}`);
  process.exit(0);
} else {
  console.log(`✗ ISSUES FOUND — ${findings.length} item(s) require attention:\n`);
  for (const f of findings) {
    console.log('  ' + f);
  }
  console.log('');
  console.log('Summary:');
  console.log(`  PHI metafield values remaining:      ${phiValuesFound}`);
  console.log(`  Legacy metafield values remaining:   ${legacyValuesFound}`);
  console.log(`  PHI definitions remaining:           ${phiDefsFound}`);
  process.exit(1);
}
