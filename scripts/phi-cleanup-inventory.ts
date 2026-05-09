/**
 * Phase 1.A — Inventory (DRY RUN, NO MUTATIONS)
 *
 * Scans all customers and their metafields. Categorizes each as KEEP,
 * DELETE-PHI, or DELETE-LEGACY. Writes a JSON report and a human-readable
 * Markdown summary. Does NOT mutate anything.
 *
 * Usage:
 *   npx tsx scripts/phi-cleanup-inventory.ts
 *
 * Required env vars:
 *   SHOPIFY_ADMIN_ACCESS_TOKEN
 *   SHOPIFY_SHOP_DOMAIN (optional, defaults to allergist-on-demand.myshopify.com)
 */

import { writeFileSync } from 'fs';
import { getAllCustomers, categorize, KEEP_SET, type MetafieldCategory } from './lib/shopify-admin.js';

const ISO = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_JSON = `scripts/output/phi-inventory-${ISO}.json`;
const OUT_MD = `scripts/output/phi-inventory-summary-${ISO}.md`;

interface CustomerSummary {
  customerId: string;
  email: string;
  metafields: Array<{
    id: string;
    namespace: string;
    key: string;
    type: string;
    category: MetafieldCategory;
  }>;
}

interface InventoryReport {
  generatedAt: string;
  shopDomain: string;
  totals: {
    customersScanned: number;
    metafieldsTotal: number;
    keep: number;
    deletePhi: number;
    deleteLegacy: number;
  };
  namespacesFound: string[];
  customers: CustomerSummary[];
}

console.log('=== Phase 1.A — PHI Metafield Inventory (READ-ONLY) ===\n');
console.log(`Shop: ${process.env.SHOPIFY_SHOP_DOMAIN ?? 'allergist-on-demand.myshopify.com'}`);
console.log(`Keep set: ${[...KEEP_SET].join(', ')}\n`);

const customers: CustomerSummary[] = [];
let totalMetafields = 0;
let keepCount = 0;
let deletePhiCount = 0;
let deleteLegacyCount = 0;
const namespacesFound = new Set<string>();

process.stdout.write('Scanning customers');

for await (const customer of getAllCustomers()) {
  process.stdout.write('.');
  const summary: CustomerSummary = {
    customerId: customer.id,
    email: customer.email,
    metafields: [],
  };

  for (const mf of customer.metafields) {
    namespacesFound.add(mf.namespace);
    const category = categorize(mf.namespace, mf.key);
    summary.metafields.push({ ...mf, category });
    totalMetafields++;
    if (category === 'KEEP') keepCount++;
    else if (category === 'DELETE-PHI') deletePhiCount++;
    else deleteLegacyCount++;
  }

  customers.push(summary);
}

console.log('\n');

const report: InventoryReport = {
  generatedAt: new Date().toISOString(),
  shopDomain: process.env.SHOPIFY_SHOP_DOMAIN ?? 'allergist-on-demand.myshopify.com',
  totals: {
    customersScanned: customers.length,
    metafieldsTotal: totalMetafields,
    keep: keepCount,
    deletePhi: deletePhiCount,
    deleteLegacy: deleteLegacyCount,
  },
  namespacesFound: [...namespacesFound].sort(),
  customers,
};

writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8');

// ── Markdown summary (counts only, no PHI values) ─────────────────────────

const customerLines = customers.map((c) => {
  const toDelete = c.metafields.filter((m) => m.category !== 'KEEP');
  if (toDelete.length === 0) return null;
  const keys = toDelete.map((m) => `${m.namespace}.${m.key}`).join(', ');
  return `| ${c.customerId.replace('gid://shopify/Customer/', '')} | ${toDelete.length} | ${keys} |`;
}).filter(Boolean);

const md = `# PHI Metafield Inventory — ${ISO}

**Generated:** ${report.generatedAt}
**Shop:** ${report.shopDomain}

## Totals

| Category | Count |
|---|---|
| Customers scanned | ${report.totals.customersScanned} |
| Total metafields found | ${report.totals.metafieldsTotal} |
| KEEP | ${report.totals.keep} |
| DELETE-PHI (alledrops namespace, not in keep set) | ${report.totals.deletePhi} |
| DELETE-LEGACY (other namespaces, PHI-shaped) | ${report.totals.deleteLegacy} |

## Namespaces found

${report.namespacesFound.map((ns) => `- \`${ns}\``).join('\n')}

## Customers with fields to delete

| Customer ID | Fields to delete | Keys |
|---|---|---|
${customerLines.length > 0 ? customerLines.join('\n') : '| — | — | No customers have fields to delete |'}

## Keep set (never deleted)

${[...KEEP_SET].map((k) => `- \`${k}\``).join('\n')}

---

*Full details (including metafield GIDs): see ${OUT_JSON}*
*This summary intentionally omits all PHI values.*
`;

writeFileSync(OUT_MD, md, 'utf8');

// ── Print results ──────────────────────────────────────────────────────────

console.log('Results:');
console.log(`  Customers scanned:    ${report.totals.customersScanned}`);
console.log(`  Total metafields:     ${report.totals.metafieldsTotal}`);
console.log(`  KEEP:                 ${report.totals.keep}`);
console.log(`  DELETE-PHI:           ${report.totals.deletePhi}`);
console.log(`  DELETE-LEGACY:        ${report.totals.deleteLegacy}`);
console.log('');
console.log(`JSON report: ${OUT_JSON}`);
console.log(`MD summary:  ${OUT_MD}`);
console.log('');

if (report.totals.deletePhi + report.totals.deleteLegacy === 0) {
  console.log('✓ No metafields to delete. Store is already clean.');
} else {
  console.log('⚠  Review the Markdown summary above before proceeding to Phase 1.B.');
  console.log('   Then run: npx tsx scripts/phi-cleanup-backup.ts ' + OUT_JSON);
}
