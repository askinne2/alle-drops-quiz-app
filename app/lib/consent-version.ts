// Bump this string whenever the consent text in ConsentStep.tsx changes.
// Format: "draft-YYYY-MM-DD" during development, "v1.0-YYYY-MM-DD" after counsel approval.
// 2026-08-09 bump: caused by D-11's section-4 interim rewrite (removed the [PENDING] placeholder).
// `submissions` is insert-only — existing rows keep their prior consent_version value untouched,
// no backfill, no migration.
export const CONSENT_VERSION = 'draft-2026-08-09'
