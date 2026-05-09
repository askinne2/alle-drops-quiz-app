# Breach Response Runbook — AlleDrops / AOD

**Classification:** Internal — HIPAA Security  
**Owner:** William (Privacy Officer) + Andrew (Security Officer, designate)  
**Last updated:** 2026-05-09

---

## What counts as a breach

Under HIPAA, a "breach" is unauthorized access, use, disclosure, or loss of unsecured PHI.  
Treat **any** of the following as a potential breach until confirmed otherwise:

- Unauthorized access to Cloud SQL (alledrops_quiz_dev or prod)
- PHI appearing in Fly.io logs, error messages, or any system not in our BAA chain
- PHI written to Shopify metafields, Shopify Admin API, Google Sheets, or Google Drive
- Lost or stolen device with access to Cloud SQL credentials or Fly secrets
- Compromised Shopify Admin token (SHOPIFY_ADMIN_ACCESS_TOKEN)
- Compromised DATABASE_URL secret
- Accidental public commit of secrets

---

## Step 1 — Contain (within 1 hour of discovery)

1. **Identify scope.** Which submissions are affected? Use Cloud SQL Studio:
   ```sql
   SELECT id, symptom_profile_id, patient_email, created_at
   FROM submissions
   WHERE created_at BETWEEN '<start>' AND '<end>'
   ORDER BY created_at;
   ```
2. **Revoke compromised credentials immediately.**
   - Fly secret: `fly secrets set DATABASE_URL="..." -a alle-drops-quiz-app` (rotate the password in Cloud SQL first, then update Fly)
   - Shopify token: Shopify Partners → App → API credentials → rotate
3. **Preserve evidence.** Export Fly logs before they roll: `fly logs -a alle-drops-quiz-app > breach-logs-$(date +%Y%m%d).txt`
4. **Do not delete data.** HIPAA requires a 6-year retention minimum.

---

## Step 2 — Assess (within 4 hours)

Answer these questions in writing:

- What PHI was exposed? (fields, not values)
- How many patients are affected? (count from Cloud SQL)
- Was the exposure to an unauthorized person, or just an internal misconfiguration?
- Is the exposure ongoing or contained?
- What was the likely cause?

Use HIPAA's four-factor test to determine if notification is required:
1. Nature and extent of PHI involved
2. Who used or could access it
3. Whether PHI was actually acquired or viewed
4. Extent to which risk has been mitigated

If any factor points toward unauthorized access of real patient data: **proceed to Step 3**.

---

## Step 3 — Notify (per HIPAA timeline)

**Individual notification:** Within 60 days of discovering the breach.
- Method: First-class mail to last known address, or email if patient has agreed to electronic notice.
- Content required: description of breach, types of PHI involved, steps individuals should take, what AOD is doing, contact info.
- Draft with in-house counsel before sending.

**HHS notification:**
- Fewer than 500 affected: submit to HHS within 60 days of end of calendar year.
- 500 or more affected: notify HHS within 60 days of discovery AND notify prominent media outlets in affected states.
- Submit at: https://www.hhs.gov/hipaa/for-professionals/breach-notification/breach-reporting/index.html

**Business Associate notification (if applicable):**
- If Fly.io or Google Cloud is the source, notify them per their BAA terms.

---

## Step 4 — Document

Record in writing (and retain for 6 years):
- Date of discovery
- Date of breach (if different)
- Description of what happened
- PHI involved
- Affected individuals count
- Steps taken to contain
- Notification dates and methods
- Corrective actions implemented

Store in: AOD's designated HIPAA records location (TBD — William to designate).

---

## Contacts

| Role | Name | Contact |
|---|---|---|
| Privacy Officer | William (AOD) | TBD |
| Security Officer | TBD | TBD |
| Engineering | Andrew Skinner | andrew@21adsmedia.com |
| In-house counsel | TBD | TBD |
| HHS OCR | — | https://www.hhs.gov/hipaa/filing-a-complaint/index.html |
| Fly.io security | — | security@fly.io |
| Google Cloud | — | cloud.google.com/support |

---

## Prevention checklist (run after any incident)

- [ ] Rotate all Fly secrets: DATABASE_URL, SHOPIFY_ADMIN_ACCESS_TOKEN, SHOPIFY_API_SECRET
- [ ] Audit Fly log retention settings — confirm request bodies are not logged
- [ ] Run `npx tsx scripts/phi-cleanup-verify.ts` — confirm no PHI in Shopify metafields
- [ ] Audit `submission_access_log` for anomalous patterns
- [ ] Review Cloud SQL authorized networks — remove any stale IP entries
