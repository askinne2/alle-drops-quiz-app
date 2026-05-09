import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorize, KEEP_SET } from '../../scripts/lib/shopify-admin.js';

// ── categorize() ──────────────────────────────────────────────────────────

describe('categorize', () => {
  it('returns KEEP for alledrops.last_completed_at', () => {
    expect(categorize('alledrops', 'last_completed_at')).toBe('KEEP');
  });

  it('returns KEEP for alledrops.quiz_count', () => {
    expect(categorize('alledrops', 'quiz_count')).toBe('KEEP');
  });

  it('returns DELETE-PHI for alledrops.quiz_score', () => {
    expect(categorize('alledrops', 'quiz_score')).toBe('DELETE-PHI');
  });

  it('returns DELETE-PHI for alledrops.severity_level', () => {
    expect(categorize('alledrops', 'severity_level')).toBe('DELETE-PHI');
  });

  it('returns DELETE-PHI for alledrops.quiz_history', () => {
    expect(categorize('alledrops', 'quiz_history')).toBe('DELETE-PHI');
  });

  it('returns DELETE-LEGACY for any non-alledrops namespace', () => {
    expect(categorize('quizkit', 'resultName')).toBe('DELETE-LEGACY');
    expect(categorize('global', 'QuizCompletionDate')).toBe('DELETE-LEGACY');
    expect(categorize('custom', 'lastName')).toBe('DELETE-LEGACY');
  });

  it('returns DELETE-LEGACY even for non-alledrops fields that sound safe', () => {
    expect(categorize('other', 'last_completed_at')).toBe('DELETE-LEGACY');
  });
});

// ── KEEP_SET ──────────────────────────────────────────────────────────────

describe('KEEP_SET', () => {
  it('contains exactly the two allowed non-PHI metafields', () => {
    expect(KEEP_SET.has('alledrops.last_completed_at')).toBe(true);
    expect(KEEP_SET.has('alledrops.quiz_count')).toBe(true);
    expect(KEEP_SET.size).toBe(2);
  });

  it('does not contain PHI fields', () => {
    expect(KEEP_SET.has('alledrops.quiz_score')).toBe(false);
    expect(KEEP_SET.has('alledrops.quiz_history')).toBe(false);
    expect(KEEP_SET.has('alledrops.severity_level')).toBe(false);
    expect(KEEP_SET.has('alledrops.symptom_profile_id')).toBe(false);
  });
});

// ── Double-guard: KEEP fields never appear in a delete list ──────────────

describe('delete list invariant', () => {
  function buildDeleteList(
    metafields: Array<{ namespace: string; key: string }>,
  ) {
    return metafields.filter((m) => {
      const cat = categorize(m.namespace, m.key);
      return cat !== 'KEEP' && !KEEP_SET.has(`${m.namespace}.${m.key}`);
    });
  }

  it('never includes KEEP fields even if miscategorized externally', () => {
    const mixed = [
      { namespace: 'alledrops', key: 'last_completed_at' },
      { namespace: 'alledrops', key: 'quiz_count' },
      { namespace: 'alledrops', key: 'quiz_score' },
      { namespace: 'quizkit', key: 'resultName' },
    ];
    const toDelete = buildDeleteList(mixed);
    expect(toDelete.find((m) => m.key === 'last_completed_at')).toBeUndefined();
    expect(toDelete.find((m) => m.key === 'quiz_count')).toBeUndefined();
    expect(toDelete).toHaveLength(2);
  });

  it('returns empty list when all fields are KEEP', () => {
    const keepOnly = [
      { namespace: 'alledrops', key: 'last_completed_at' },
      { namespace: 'alledrops', key: 'quiz_count' },
    ];
    expect(buildDeleteList(keepOnly)).toHaveLength(0);
  });
});

// ── Failure tolerance: errors don't block other deletions ─────────────────

describe('deleteMetafields error tolerance', () => {
  it('accumulates errors without throwing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        data: {
          metafieldsDelete: {
            deletedMetafields: [{ ownerId: 'gid://shopify/Customer/1', namespace: 'alledrops', key: 'quiz_score' }],
            userErrors: [{ field: ['metafields', '1'], message: 'Metafield not found' }],
          },
        },
      }),
    });

    vi.stubGlobal('fetch', mockFetch);
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'test-token';

    const { deleteMetafields } = await import('../../scripts/lib/shopify-admin.js');
    const result = await deleteMetafields([
      { ownerId: 'gid://shopify/Customer/1', namespace: 'alledrops', key: 'quiz_score' },
      { ownerId: 'gid://shopify/Customer/1', namespace: 'alledrops', key: 'missing_field' },
    ]);

    expect(result.deleted).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Metafield not found');

    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    vi.unstubAllGlobals();
  });
});

// ── Verify exit code logic ────────────────────────────────────────────────

describe('verify logic', () => {
  it('identifies findings correctly for PHI categories', () => {
    const metafields = [
      { namespace: 'alledrops', key: 'last_completed_at' },
      { namespace: 'alledrops', key: 'quiz_count' },
      { namespace: 'alledrops', key: 'quiz_score' }, // PHI — should be flagged
      { namespace: 'quizkit', key: 'resultName' }, // legacy — should be flagged
    ];

    const findings = metafields.filter((m) => categorize(m.namespace, m.key) !== 'KEEP');
    expect(findings).toHaveLength(2);
  });

  it('produces zero findings after a clean sweep', () => {
    const cleanMetafields = [
      { namespace: 'alledrops', key: 'last_completed_at' },
      { namespace: 'alledrops', key: 'quiz_count' },
    ];

    const findings = cleanMetafields.filter((m) => categorize(m.namespace, m.key) !== 'KEEP');
    expect(findings).toHaveLength(0);
  });
});
