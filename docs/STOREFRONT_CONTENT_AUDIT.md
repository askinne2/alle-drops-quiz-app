# AOD Storefront — Content Readiness Audit
**Date:** May 8, 2026 (re-crawled May 8, 2026 — post-update pass)
**Store:** allergist-on-demand.myshopify.com
**Auditor:** Claude Code (live Chrome DevTools crawl)

---

## PAGE-BY-PAGE AUDIT

---

### Homepage — `/`

**Status:** ⚠️ Needs Updates

**Issues resolved since last audit:**
- ✅ FAQ "How long until I see results?" — now correctly reads: *"3–6 months of consistent daily use… most patients see optimal results after 2–3 years of treatment."*
- ✅ FDA notice — now present globally in footer on all pages.
- ✅ Step 2 copy — now reads "Choose from Tennessee or Texas regional formulas and select your preferred supply plan." (allergy-specific language removed)

**Remaining issues:**
- **[MEDIUM — Product Name]** Products still labeled "Tennessee - AlleDrops" and "Texas - AlleDrops" (with dashes). Brand direction specifies no dash.
- **[MEDIUM — Accuracy]** "About AlleDrops" block still says drops are *"customized to your region and allergy profile."* "Allergy profile" overstates the personalization.
- **[NEW — Typo]** Footer FDA statement ends with a stray closing quotation mark: `…FDA-approved allergen extracts."` — the trailing `"` should be removed. Appears globally on every page.

---

### How It Works — `/pages/how-it-works`

**Status:** ✅ Mostly Resolved

**Issues resolved since last audit:**
- ✅ Step 1 copy updated: correctly frames quiz as clinical assessment, not a product selector.
- ✅ Step 2 copy updated: quiz determines candidacy; state determines formula.
- ✅ "What are AlleDrops" section now includes 3–6 month / 2–3 year treatment duration.
- ✅ FDA notice present via global footer.

**Remaining issues:**
- **[MEDIUM — Missing]** No link to or mention of `/pages/test-options`. Patients wanting testing context have nowhere to go from this page.
- **[LOW]** Step 3 still does not state the $99 consultation fee in body text.

---

### Allergy Quiz — `/pages/allergy-quiz`

**Status:** ⚠️ Needs Updates

**Issues resolved since last audit:**
- ✅ Intro body copy updated: *"Answer a few questions about your allergy symptoms to see whether you may be a candidate for sublingual immunotherapy with AlleDrops. Available to residents of Tennessee and Texas."*
- ✅ FDA notice present via global footer.

**Remaining issues:**
- **[HIGH — Legal/Clinical]** Medical disclaimer still reads: *"This assessment is for product recommendation purposes only and does not constitute medical advice."* A scored symptom assessment that can return "no SLIT recommended" cannot be characterized as a product recommendation tool. Requires William and/or counsel to rewrite.
- **[MEDIUM — Missing]** "What are AlleDrops" explainer on this page says drops are *"effective for both seasonal and environmental allergies"* — no mention of 3–5 year treatment duration. Should set that expectation here too.

---

### Tennessee AlleDrops — `/products/tennessee-alledrops`

**Status:** 🔴 Major Rework (unchanged)

**Issues resolved since last audit:**
- ✅ FDA notice present via global footer.

**Remaining issues — all original HIGH/MEDIUM items still unresolved:**
- **[HIGH — Accuracy]** *"there is no longer a need for needles or allergy tests to receive allergy treatment"* — the allergy-testing clause must be removed.
- **[HIGH — Missing Disclaimer]** No contraindication warnings (severe/uncontrolled asthma, current pregnancy, history of anaphylaxis).
- **[HIGH — Missing Disclaimer]** No emergency instruction ("For allergic reactions or medical emergencies, call 911.").
- **[MEDIUM — Missing]** No treatment duration expectation.
- **[MEDIUM — Grammar]** *"helps to increase and reduce allergy symptoms"* — broken phrasing unchanged.
- **[MEDIUM — Product Name]** Title still "Tennessee - AlleDrops" (dash).
- **[LOW]** Insurance disclaimer still in all-caps: "PLEASE NOTE: WE DO NOT ACCEPT MEDICAL INSURANCE FOR ANY OF THESE PRODUCTS."

---

### Texas AlleDrops — `/products/texas-alledrops`

**Status:** 🔴 Major Rework (unchanged)

**Issues resolved since last audit:**
- ✅ FDA notice present via global footer.

**Remaining issues:**
All issues from Tennessee AlleDrops apply identically — description is identical, none of the HIGH/MEDIUM items have been addressed.

---

### Allergy Consultation — `/products/allergy-consultation`

**Status:** 🔴 Major Rework (partially addressed)

**Issues resolved since last audit:**
- ✅ Price corrected: now $99.00 USD.
- ✅ FDA notice present via global footer.

**Remaining issues:**
- **[HIGH — Broken Feature]** "Schedule" button still has no functioning booking mechanism. Patients cannot book a consultation.
- **[HIGH — Missing Page]** `/pages/consult` is still 404. The product page is not an adequate substitute.
- **[HIGH — Missing Content]** Description remains only: *"Virtual visit with a Board Certified Allergist."* No duration, format, what happens after, or when consultation is recommended.
- **[HIGH — Missing Disclaimer]** No provider independence statement.
- **[MEDIUM — Missing Context]** No statement that consultation is always optional, never required.

---

### About AlleDrops — `/pages/about-us`

**Status:** ⚠️ Needs Updates

**Issues resolved since last audit:**
- ✅ "Nationwide" geographic claim removed — now reads *"connects patients to licensed allergy specialists"* (no geographic scope claim).
- ✅ "Everyone, everywhere" language removed — replaced with *"bringing you direct allergy relief."*
- ✅ FDA notice present via global footer.

**Remaining issues:**
- **[MEDIUM — Needs Verification]** *"AOD has helped thousands of patients find lasting relief"* — still present. Must be verified with William before publishing.
- **[MEDIUM — Accuracy]** *"discover your personalized regional formula"* — still overstates individualization.
- **[MEDIUM — Missing]** No mention of the 3–5 year treatment commitment on this page.

---

### Our Team — `/pages/our-team`

**Status:** ❌ Page now returns 404

**New finding:** The `/pages/our-team` page no longer exists — it returns a 404. The About page now has a condensed "Meet Your Provider" section mentioning only Dr. Ryan Sullivan MD. If the team page was intentionally removed, the About page's provider section should be verified with William to confirm Dr. Sullivan's active role and that the other four listed providers (Dr. Miller, Dr. Wright, Aida Figueroa, Scott Sumrall) are no longer being featured. If the removal was unintentional, the page needs to be restored.

- **[HIGH — New]** `/pages/our-team` is a dead link returning 404. Any inbound links or nav references need to be cleaned up or the page restored.
- **[MEDIUM — Needs Verification]** About page states *"Dr. Ryan Sullivan, MD is our board-certified allergist who handles all AlleDrops telehealth consults"* — William must confirm this is accurate and current.

---

### Contact — `/pages/contact`

**Status:** ⚠️ Needs Updates (unchanged)

**Issues resolved since last audit:**
- ✅ FDA notice present via global footer.

**Remaining issues — all original items still unresolved:**
- **[HIGH — Patient Safety]** No emergency 911 instruction. Must appear above the form: *"For medical emergencies or allergic reactions, call 911. Do not use this form in an emergency."*
- **[MEDIUM — Missing]** No response time expectation.
- **[MEDIUM — Missing]** No guidance on when to use the contact form vs. booking a consultation.
- **[LOW]** No alternative contact method (phone or email) listed.

---

### All Products / Collections — `/collections/all`

**Status:** ⚠️ Needs Updates (unchanged)

No changes observed from initial audit. Allergy Consultation still appears in the browse collection. Legacy `/products/regional-allergy-drops` redirect still unreviewed.

---

### Privacy Policy — `/policies/privacy-policy`

**Status:** 🔴 Major Rework (unchanged)

No changes observed. All original launch blockers remain:
- **[HIGH — Launch Blocker]** Contact email is still `andrew@21adsmedia.com`.
- **[HIGH — HIPAA]** No HIPAA, no Notice of Privacy Practices, no PHI language. Standard Shopify template unchanged.
- **[HIGH — HIPAA]** Marketing/advertising data use provisions are still incompatible with HIPAA. Requires AOD counsel review.

---

### /pages/test-options

**Status:** ✅ Page now exists

**New finding:** Page was previously a 404 and is now live with substantial content covering IgE blood testing via Labcorp/Quest, the option to proceed without testing, and a "Book a Consultation" CTA.

**Remaining caveats (from original audit's "Pending from William" list):**
- **[MEDIUM — Needs Verification]** Clinical copy on what IgE testing involves and how results factor into the AlleDrops prescription was flagged as requiring William's input. The page is live — confirm William has reviewed and approved the clinical claims before promoting this page.
- **[MEDIUM — Missing]** No FDA notice on this page beyond the global footer. For a page describing clinical testing that leads to a prescription product, an inline FDA notice would be appropriate.
- **[MEDIUM — Missing]** No emergency instruction on this page.
- **[LOW — Missing]** No pricing for Labcorp/Quest tests beyond a general disclaimer that fees are billed by the lab.

---

### /pages/consult

**Status:** ❌ Still 404 (unchanged)

Page does not exist. The consultation product page price has been corrected to $99, but there is no booking-capable consultation landing page. Launch blocker.

---

---

## SUMMARY SECTION

---

### Sitemap Inventory (updated)

| URL | Page | Audit Status |
|-----|------|-------------|
| `/` | Homepage | ⚠️ Needs Updates |
| `/pages/how-it-works` | How It Works | ✅ Mostly Resolved |
| `/pages/allergy-quiz` | Symptom Quiz | ⚠️ Needs Updates |
| `/pages/about-us` | About AlleDrops | ⚠️ Needs Updates |
| `/pages/our-team` | Our Team | ❌ 404 — needs decision |
| `/pages/contact` | Contact | ⚠️ Needs Updates |
| `/products/tennessee-alledrops` | Tennessee AlleDrops | 🔴 Major Rework |
| `/products/texas-alledrops` | Texas AlleDrops | 🔴 Major Rework |
| `/products/allergy-consultation` | Allergy Consultation | 🔴 Major Rework |
| `/products/regional-allergy-drops` | Legacy handle (→ redirects to Texas) | ⚠️ Review redirect |
| `/collections/all` | All Products | ⚠️ Needs Updates |
| `/policies/privacy-policy` | Privacy Policy | 🔴 Major Rework |
| `/pages/test-options` | Testing Options | ✅ Now live (verify clinical copy with William) |
| `/pages/consult` | Book Consultation | ❌ Still 404 |

---

### Launch Blockers (updated)

Items marked ✅ have been resolved. Remaining open blockers:

**1. ~~FAQ answer — wrong treatment timeline (Homepage)~~ ✅ RESOLVED**

**2. ~~"Nationwide" geographic claim (About page)~~ ✅ RESOLVED**

**3. ~~"Everyone, everywhere" language (About page)~~ ✅ RESOLVED**

**4. ~~FDA notice absent from all product and treatment pages~~ ✅ RESOLVED via global footer**

**5. Product descriptions — "no allergy tests needed" (TN and TX product pages)**
Still present on both product pages. *"there is no longer a need for needles or allergy tests"* must have the allergy-testing clause removed.

**6. Contraindication warnings missing (TN and TX product pages)**
No warnings for severe/uncontrolled asthma, current pregnancy, or history of anaphylaxis. Still absent.

**7. Emergency instruction missing from product and contact pages**
"For allergic reactions or medical emergencies, call 911" still absent from product pages and the contact page.

**8. ~~Consultation product priced incorrectly ($149)~~ ✅ RESOLVED — now $99**

**9. Consultation booking is broken**
"Schedule" button still has no booking mechanism on `/products/allergy-consultation`.

**10. `/pages/consult` does not exist**
Still 404. Required consultation landing page with booking widget not created.

**11. Privacy policy contact email is `andrew@21adsmedia.com`**
Unchanged. Developer email must be replaced with AOD-owned address before launch.

**12. Privacy policy has no HIPAA/NPP coverage**
Unchanged. Standard Shopify template insufficient for HIPAA-covered telehealth entity.

**13. Quiz page medical disclaimer mischaracterizes the assessment**
Still reads "for product recommendation purposes only." Requires William and/or counsel to rewrite.

**14. NEW — `/pages/our-team` returns 404**
Was previously a live page. Needs a decision: restore or confirm intentional removal and clean up any references.

**15. NEW — Global footer FDA notice has trailing stray quotation mark**
`…FDA-approved allergen extracts."` — the closing `"` appears on every page footer. Minor but looks unprofessional and may confuse screen readers.

---

### What Was Fixed This Pass

| Item | Status |
|------|--------|
| FAQ treatment timeline (4–6 weeks → 3–6 months / 2–3 years) | ✅ |
| Global FDA footer notice | ✅ |
| Homepage Step 2 "allergy-specific options" language | ✅ |
| How It Works Step 1 clinical framing | ✅ |
| How It Works Step 2 formula routing logic | ✅ |
| How It Works treatment duration in "What are AlleDrops" | ✅ |
| About page "nationwide" claim | ✅ |
| About page "everyone, everywhere" language | ✅ |
| Consultation product price ($149 → $99) | ✅ |
| Quiz intro body copy (state + candidacy framing) | ✅ |
| `/pages/test-options` created | ✅ |

---

### Content Still Pending from William (AOD Medical Director / Client)

| Item | Page(s) Affected | Why It Can't Be Written Without Client |
|------|-----------------|---------------------------------------|
| Tennessee-specific allergen list | `/products/tennessee-alledrops` | Proprietary blend — must come from William or pharmacy |
| Texas-specific allergen list | `/products/texas-alledrops` | Same |
| IgE testing clinical copy approval | `/pages/test-options` | Page is live — William must confirm clinical claims are accurate |
| "Thousands of patients" claim verification | `/pages/about-us` | Must be accurate before publishing |
| HIPAA Notice of Privacy Practices | `/policies/privacy-policy` | Must be drafted by AOD's Privacy Officer or counsel |
| Revised quiz disclaimer | `/pages/allergy-quiz` | Medical director or counsel must approve clinical characterization |
| Complete contraindication list | Both product pages | William to confirm full list for AOD's SLIT protocol |
| Consultation format details | `/pages/consult` (to be created) | Duration, video vs. phone, what allergist can prescribe |
| Privacy Officer / Security Officer names | `/policies/privacy-policy` | Required for HIPAA NPP |
| Dr. Ryan Sullivan active role confirmation | `/pages/about-us` | Listed as sole provider; confirm still current |
| Our Team page decision | `/pages/our-team` | Was live, now 404 — intentional? |

---

### Pricing Verification

| Variant | Price | Status |
|---------|-------|--------|
| Quarterly (3 month) | $297.00 | ✅ |
| Semi-Annual (6 month) | $534.00 | ✅ |
| Annual (12 month) | $948.00 | ✅ |
| Allergy Consultation | $99.00 | ✅ Fixed |
