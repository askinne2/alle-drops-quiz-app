# HANDOFF — AlleDrops Symptom Quiz

## 2026-11-20 — video for consults: Google Meet, not Zoom; Cowlendar offered as the alternative (reply sent)

**Now:** Andrew sent a reply-all to William, cc Robert, on 11/20 (thread `1a0e8ef49d10b532`, answering William's 11/19 10:03 PM "We have a Teams account - would that work? Or does it have to be Zoom?"). Waiting on AOD to pick an app and video tool. Nothing in Shopify or Appointly was changed. No code changed.

**What the reply said (Andrew's final wording):** Teams isn't a video option in Appointly; it makes links through Zoom or Google Meet only, so go with Google Meet (AOD already has Google; no Zoom account needed). Ryan connects his AOD Google account; each consult gets its own Meet link and his calendar blocks busy time. Appointly still needs Pro ($9/mo). Appointly is a suggestion (cheapest with many reviews), not a requirement; linked the Shopify App Store "booking calendar" search so AOD can look at others. Screenshot of Appointly's Integrations page attached.

**Checked 11/20 (Dia, AOD admin, read-only):**
- Appointly Settings → Integrations shows **Zoom** and **Google Meet** only, both behind Pro. No Teams, no Outlook video. Meet needs each team member to connect their Google account (Team → edit). This corrects the 11/19 note "Zoom only, no Google Meet".
- Service "Allergy Consultation" → Default Title variant: Location Type "Address", Location blank. The dropdown's other options weren't readable (cross-origin iframe).
- Billing: plan "free", 1 team member, 1 service.

**Alternative Andrew pointed AOD to (maybe preferred): Cowlendar** (https://apps.shopify.com/cowlendar, listing read 11/20). Video/calendar: Google, Outlook, Zoom, **Teams** on every paid plan. Starter $13.99/mo up to $1,000 booking revenue/mo (about 10 consults at $99); Basic $29.99 up to $3,000; Growth $59.99 up to $10,000. Free plan 5 bookings/mo. Fits AOD's Teams/Outlook; costs more above ~10 consults/mo; switching means rebuilding the $99 consult product and Ryan's setup (about 1 hour).

**HIPAA gap (not in the sent email):** Meet/Calendar for patient visits need the **Google Workspace** BAA accepted in the Admin console (separate from the Google Cloud BAA accepted 10/05). Google lists Meet and Calendar as HIPAA Included Functionality (https://support.google.com/a/answer/3407054). If AOD goes Cowlendar + Teams, the same question applies to their Microsoft 365 plan (not checked). Raise with Robert before Ryan's first real consult.

**Next steps, in order:**
1. Wait for AOD's choice: Appointly + Google Meet, or Cowlendar + Teams/Outlook. No chase.
2. Before the first real consult: confirm the Workspace BAA (Meet) or Microsoft 365 BAA (Teams) with Robert.
3. If Appointly: Robert switches to Pro; Ryan connects Google; swap Ryan off `info@aod.services`; set location/cutoff; Loom. If Cowlendar: install, rebuild the $99 consult, connect Ryan's Outlook/Teams, then remove Appointly.
4. One test booking of the consult through checkout, then cancel it.
5. Still open: #5b (booking app on the PHI quiz page) before go-live.

---

## 2026-11-19 — consult booking decided: stay on Appointly, upgrade to Pro (AOD's click); reply sent to William

**Now:** Consults stay on the Appointly ("Apntly") Shopify app. Andrew's reply went to William, cc Robert, on 11/19 (thread `1a0e8ef49d10b532`, Superhuman draft `draft0098286dbe9c104b`, send status "closed / in_flight"). Nothing in Shopify, Appointly or Cloud Run was changed. No code changed. Session tab: AlleDrops Workspace → Sessions → 2026-11-19.

**Why (William asked 11/18 whether to use Calendly):**
- The consult is paid ($99, TELE-01). Appointly takes payment at Shopify checkout. Calendly needs Standard ($10/seat/mo) plus its own Stripe, outside Shopify orders.
- Five Shopify booking apps compared on their App Store listings (11/19): Appointly Pro $9/mo is the cheapest that covers calendar sync + Zoom + a staff login. Tipo $99/yr (Google only, no Zoom listed), Cowlendar $13.99/mo (capped at $1,000/mo bookings), Appointo (staff portal only on $421/yr), Easy Appointment Booking (staff logins on top tier, $350+/yr).
- No app, and not Calendly, shows a BAA. #5b (Appointly on the PHI quiz page) is unchanged by this choice.

**Appointly as found in the admin (Dia, read-only, 11/19):**
- Plan **Free**. Service "Allergy Consultation", 60 min, payment required. Product price $99.00 (product `7601817157838`).
- Team: one member, "Dr. Ryan Sullivan, MD", email `info@aod.services` (looks shared), created 8/28. "Send Account Link" never used.
- Weekly hours Mon to Fri 10 AM to 5 PM. Hours are **admin-set**: the team login shows "their bookings only".
- Meeting location: type "Address", blank, so no video link today. Cutoff 10 min, max 365 days ahead.
- Google/Outlook sync and Zoom are locked behind Pro. Pro sync: busy time on the connected calendar is removed from booking. Zoom only, no Google Meet.
- 1 booking total, $0 revenue (likely a test; not opened).

**Andrew's calls (11/19):** stay on Appointly. Robert (or William) approves the Pro charge, since it's on AOD's bill and Andrew is a collaborator. Calendar and Zoom are **AOD's** Google Workspace calendar and AOD's Zoom; this is an AOD setup step that Andrew coaches, not one he "takes care of". Ryan gets an Appointly login, not a Shopify login. Guide for Ryan = a Loom, recorded after Pro is on (no public Appointly docs found).

**Not done / not verified:**
- No end-to-end test booking of the $99 consult through checkout. The sent email says patients pick a time and pay in one step.
- Whether Andrew's collaborator account has "Approve app charges" (not checked; moot if Robert clicks).
- Booking cutoff of 10 minutes not raised; meeting location still blank.

**Next steps, in order:**
1. Wait for Robert to switch Appointly to Pro and for William/Ryan to send: login email, Google calendar to connect, AOD Zoom account, confirm Mon to Fri 10 to 5 and 60 min. No chase.
2. Run one test booking of the consult through checkout, then refund/cancel it (~15 min).
3. When Pro is on: swap Ryan's email off `info@aod.services`, coach the calendar + Zoom connect, set a meeting location, raise the cutoff (ask AOD what notice Ryan needs), then "Send Account Link".
4. Record the ~3-min Loom for Ryan, with the bookings list hidden unless that one booking is confirmed test data.
5. Still open from 11/2: decide #5b (Appointly on the PHI quiz page) before go-live.

---

## 2026-11-02 — replied to William and Robert; draft policies loaded in Shopify behind the password

**Now:** The store is still password protected and not live. Shopify email domain authentication shows **Authenticated**. Shopify Payments still shows **Complete setup**. Draft policies are loaded for AOD and counsel to edit. Prod Cloud Run was not touched. No code changed. Session tab: AlleDrops Workspace → Sessions → 2026-11-02.

**#3 closed (checked in Shopify admin and with `dig`, 11/2).** Sender is `info@allergistondemand.com`, badge is Authenticated, and all 6 Shopify CNAMEs plus `_dmarc` resolve.

**Draft policies (Andrew's call, 11/2).** Loaded through the Shopify admin in Dia, each opening with a "DRAFT, NOT APPROVED" line, with open items in `[brackets]`:

| Draft | Where | Source |
|---|---|---|
| Return and refund | Settings > Policies | Treatment Policy paragraph + SHOP-05 must-includes |
| Privacy | Settings > Policies; "Use automated policy" switched off | Google Doc tab / `policy-drafts/02-privacy-policy.md`, attorney notes removed |
| Terms of service | Settings > Policies | New starter text, with liability and governing law left to counsel |
| Shipping | Settings > Policies | New starter text + SHOP-05 must-includes |
| Contact information | Settings > Policies | Bracketed fields only |
| Notice of Privacy Practices | Online Store > Pages, **Hidden**, page `154456588494` | Google Doc tab / `policy-drafts/01-notice-of-privacy-practices.md` |

Source Doc: https://docs.google.com/document/d/1qSViJDO37OAERtK4we8ODGSFXTlZfUVYqinLcISrYo4/edit

**Trap: Shopify policies have no draft state.** Saved policies show "Published." The store password is the only guard, and `curl` on all 5 `/policies/*` URLs returned a 302 to `/password`. Removing the password publishes them, brackets and DRAFT lines included.

**Reply sent (11/2 10:26 UTC, to William, cc Robert, thread `1a0e8ef49d10b532`, message `1a19bcba15cde3db`).** It answers William's 10/29 questions on both threads: not live yet, sender done, Payments not finished, drafts loaded, consult details needed. The TypeSafe gate returned "revise" on every try (unsourced-claims signal); Andrew overrode it after seeing the text.

**Not done / not verified:**
- Hidden Notice page from outside: `curl` got 429 both times, so the password redirect wasn't confirmed. Admin shows Hidden.
- Whether Robert's 10/29 "got the payment info" means Shopify Payments or the billing card. Payments is unfinished and billing still shows the same card (AOD's to manage; keep it off our asks).
- Medical Disclaimer and Consent Text were not loaded; they belong in the quiz (LAUNCH-03). Legal notice is blank.
- The 10/27 `session.storage.ready` watch query was not run this session.
- Automated-privacy text was replaced; the "Use automated policy" toggle restores it.

**Next steps, in order:**
1. Decide #5b (Appointly on the PHI quiz page: remove it or get a BAA) before go-live, because the draft Privacy Policy says no tracking runs on health-collection pages (~15 min to decide).
2. Run the 10/27 watch query from the 10/22 entry (~5 min).
3. Wait for AOD's reply on Payments, policy approval and blanks, and consult details. No second email.
4. When Payments is finished and the policies are approved: confirm brackets and DRAFT lines are gone, run a test order, remove the password (#4).
5. Then Appointly consult setup (#5), walkthrough (#6) and confirmation line (#7).

---

## 2026-10-27 — #3 done on the DNS side: Shopify sender auth + DMARC records live

**Now:** All 7 DNS records for Shopify email are live on `allergistondemand.com`. Shopify's "Email domain authentication" badge went from **Needs setup** to **Propagating** (07:49 ET 10/27). It's waiting on Shopify's own re-check, which takes a few hours and at most 48. Until it passes, store mail goes out from the backup `store+65752301774@shopifyemail.com`. Prod Cloud Run unchanged (rev `alle-drops-quiz-app-00006-c6j`).

**What changed (GoDaddy, `allergistondemand.com` → DNS, via Andrew's delegate access to Richard Wright's account):**

| Type | Name | Value |
|---|---|---|
| CNAME | `mailerlra` | `ced3fc2bcecb.p603.email.myshopify.com` |
| CNAME | `lra._domainkey` | `dkim1.ced3fc2bcecb.p603.email.myshopify.com` |
| CNAME | `lra2._domainkey` | `dkim2.ced3fc2bcecb.p603.email.myshopify.com` |
| CNAME | `mailer4dm` | `182301fd5fab.p421.email.myshopify.com` |
| CNAME | `pdk1._domainkey.mailer4dm` | `dkim3.182301fd5fab.p421.email.myshopify.com` |
| CNAME | `pdk2._domainkey.mailer4dm` | `dkim4.182301fd5fab.p421.email.myshopify.com` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@allergistondemand.com` |

- TTL 1/2 hour. Record count went from 20 to 27. No 2FA prompt.
- Verified with `dig` on `ns21.domaincontrol.com`, `8.8.8.8` and `1.1.1.1`: all 7 resolve.
- Shopify sender was already `info@allergistondemand.com`. "I updated DNS records" clicked in Shopify.
- Untouched: SPF (`v=spf1 a:dispatch-us.ppe-hosted.com include:secureserver.net -all`), MX (Proofpoint `ppe-hosted.com`), A, Outlook autodiscover. `alledrops.com` was not changed.
- DMARC at `p=none` (reports only, nothing blocked). Tightening to `quarantine` later is optional and AOD's call.

**What worked:** "Manual setup" in Shopify lists the exact records. GoDaddy's "Add New Record" → "Add More Records" takes all 7 in one save. The page scrolls between clicks, so take a fresh screenshot before each coordinate click. Element refs go stale after the Type dropdown re-renders a row.

**What didn't:** the first `dig` on ns21 missed one record seconds after save. That was a timing blip; it resolved on re-query.

**Next steps, in order:**
1. Reload Shopify → Settings → Notifications. When the badge says **Authenticated**, #3 is closed. If it's still Propagating on 10/29, click "I updated DNS records" again, then contact Shopify support (the DNS is correct).
2. Run the 10/27 watch query from the 10/22 entry: expect a `session.storage.ready` WARNING and no alert email.
3. Decide #5b (Appointly on the PHI quiz page).
4. Unchanged: waiting on AOD for #1 Payments and #2 policies. No chase.

---

## 2026-10-26 — go-live push: two AOD items left before the store goes live

**Now:** The store can go live once AOD sets up Shopify Payments and the store policies. Nothing in DNS, Shopify or Cloud Run changed on 10/26. Prod is still rev `alle-drops-quiz-app-00006-c6j`.

**Registrar access (granted 10/26).** GoDaddy "Account Access" invite from Richard (Dick) Wright, Founder/Chairman of Allergy Services of America (not Robert). Level **Domains Only**, so DNS edits are possible. Andrew accepted 10/26. 12 domains, all active and locked. The two that matter: `allergistondemand.com` (expires 2028-11-22) and `alledrops.com` (expires 2028-11-05). Others: aod.services, allergistondemand.net, allergywell.org/.net, allergygone.org, mobileallergyservices .com/.net/.org, cardiovascularscreening.net, spallc.info.

**Reply sent to Robert, cc William (10/26 3:55 PM ET, Superhuman thread `1a178ede74e18710`, "Re: GoDaddy").** Robert asked whether Domains Only was enough. Andrew said yes and cut the open list down to what's needed to go live. The 10/22 no-chase wait ended when Robert wrote first; the next contact is their reply or the handoff call.

**Open launch items (Andrew's call, 10/26). Replaces the 10/22 table below.**

| # | Item | Owner | State |
|---|---|---|---|
| 1 | Shopify Payments (bank + tax info) | AOD | Asked 10/26 |
| 2 | Store policies: refund/returns, contact info (Shopify marks it required), terms of service, shipping | AOD | Asked 10/26 |
| 3 | Shopify sender to info@allergistondemand.com, plus domain-auth CNAMEs and DMARC in GoDaddy | Andrew | Promised "this week", ~30 min |
| 4 | Take the store live (remove the storefront password) | Andrew | After 1 and 2 |
| 5 | Set up Appointly for the allergy consult | Andrew | Needs from AOD: who takes consults (which email to connect), days and times |
| 5b | Appointly loads on the PHI quiz page (CLAUDE.md rule 4) | Andrew | Open since 10/22: take it off that page or get Appointly's BAA, before go-live |
| 6 | Walk AOD through the quiz: admin results, PDF download, patient view (45-min call offered) | Andrew | Offered 10/26 |
| 7 | Order confirmation email: "won't ship until quiz + testing on file" line | Andrew | After AOD's refund wording (#2) |

**Off the launch list (Andrew's call, 10/26).** Not tracked as our work anymore:
- Home page "no needles, no appointments required" copy (old #7): dropped.
- Domain spelling / LAUNCH-07 (old #9): not needed to go live; the quiz keeps its `run.app` URL.
- NPP, privacy and security officers, HIPAA training, consent sign-off, fulfillment check (old #8): AOD's and counsel's duties, still required before the first real patient. Not a gate on Andrew's work.
- Robert rotating the emailed passwords + 2-step, William's written OK on the Google Cloud BAA: raise on the handoff call.

**Still attached to us after launch:** the "AlleDrops Quiz Production" app lives in the 21 ads Dev Dashboard org; Andrew's standing access on `aod-production-510006` needs Robert to remove.

**Next steps, in order:**
1. Do #3: sender switch, CNAMEs, DMARC (~30 min).
2. Run the 10/27 watch query from the 10/22 entry below: expect a `session.storage.ready` WARNING and no alert email.
3. Decide #5b (Appointly on the quiz page), then, when AOD replies with the consult details, set up Appointly (#5).
4. When #1 and #2 are done: take the store live (#4), then the walkthrough call (#6) and the confirmation email (#7).

---

## 2026-10-22 — alert emails diagnosed: CPU-starved session check (PR #55)

**Prod:** Cloud Run revision `alle-drops-quiz-app-00006-c6j` (main @ `be80a91`), 100% traffic, `/health` 200, service config unchanged, clean startup logs.

- **Cause of the "server errors" emails** (10/14 00:48, 10/16 00:32, 10/21 23:15, 10/22 00:09 UTC, rev 00005): Cloud Run started a replacement min-instance (`MANUAL_OR_CUSTOMER_MIN_INSTANCE`) with no request in flight. CPU is only allocated during requests, so the Prisma session-storage startup check ran starved, hit the 10 s pool timeout (P2024) and reported ERROR 9-14 min after start (nominal budget ~3 min). The #49 30 s background re-poll then failed ~2,800 times/day on that instance and never recovered. Cloud SQL had no restarts or maintenance. 10/11 09:10 (rev 00004) was the old crash-loop that #49 already fixed.
- **Impact:** none. 23 requests since 10/11 (22x 200, 1x 404), zero 5xx.
- **Fix (#55, Andrew picked option B over always-on CPU, ~$45-55/mo, and alert tuning):** startup check 3x2 s, failure logs a scrubbed WARNING (does not page). No background re-poll. `ReadyOnRequestSessionStorage` in `app/shopify.server.ts` re-checks on the session call that needs it (CPU available), one shared poll. Success logs INFO; failure logs ERROR `phase: "request"`, so a real outage with a waiting request still pages.
- **Tests:** `tests/session-storage-startup.test.ts` 10/10, typecheck clean, build OK. Full suite 966/968. `quiz-resume-payload-parity` (2) and `quiz-file-upload-dom` (1) fail under full-suite load on main too and pass alone. That is pre-existing flakiness.

**Watch (around 10/27):** the next replacement min-instance on rev 00006 should log a `session.storage.ready` WARNING with `phase: "startup"` and send no alert email. Query: `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="alle-drops-quiz-app" AND jsonPayload.source="session.storage.ready"' --project aod-production-510006 --limit 20`.

_Superseded 10/26: see the open items table above._

**No chase (Andrew, 10/22).** The last email was Andrew's 10/6 ask to Robert, cc William (registrar access, Shopify Payments). No reply since, and nothing sent since. Do not nudge, do not draft a "final look" email. Wait for them to come back on their own; the vault `next_check` is 2026-12-01.

**Leftover launch items (live store + admin checked 10/22).** Storefront copy is done: TEST-06 clause gone from both product pages, `/pages/test-options` says testing is required, purchase checkboxes on both products, no trackers, no placeholders. Left:

| # | Item | State | Owner |
|---|---|---|---|
| 1 | Shopify Payments | Not set up (bank + tax info) | William / Robert |
| 2 | Registrar access (allergistondemand.com, alledrops.com) | Not granted; blocks sender email on info@ + CNAMEs + DMARC | Robert |
| 3 | Return and refund policy (SHOP-05) | Not set; `/policies/refund-policy` 404 | William |
| 4 | Contact information policy | Not set; Shopify marks it Required | AOD |
| 5 | Terms of service, shipping policy | Not set | AOD / counsel |
| 6 | Order confirmation email (SHOP-05) | Stock template, no "won't ship until quiz + testing" line | Andrew, after #3 |
| 7 | Home copy "no appointments required" / "no clinic visits required" | Questionable for untested patients; raise with William | William |
| 8 | SHOP-06 fulfillment step, LAUNCH-05 NPP/officers/training, LAUNCH-03 consent sign-off | AOD side | William / counsel |
| 9 | LAUNCH-07 domain spelling | Waiting | William |

Vault mirror: `~/Vaults/ads-os/20-Projects/AlleDrops-Shopify-Quiz.md` § Leftover launch items.

**Diagnosis method (PHI-safe):** read only log metadata, redact emails and digits in Python before printing, strip query strings from URLs. In zsh, use a function for repeated `gcloud logging read` windows: `set -- $w` does not word-split.

---

## 2026-10-11 — error alerts, PHI log fixes, session-storage hardening

**Prod:** Cloud Run revision `alle-drops-quiz-app-00005-c4r` (main @ `eebc372`), 964/964 tests at deploy.

- **#45** structured server errors to stderr (`app/lib/error-reporting.server.ts`): Cloud Error Reporting picks them up; PHI scrubbed; `handleError` + uncaught-exception monitor in `app/entry.server.tsx`; admin smoke route `/app/error-reporting-test`.
- **#48** every raw `console.error(err)` in Shopify/db/admin paths routed through the scrubber (pg errors reduced to code + constraint).
- **#47** Verify Metafields lookup is a POST; no email in URLs. Andrew verified in the embedded admin 10/11.
- **#49** `PrismaSessionStorage` retries 12x5s at startup, stays up and re-checks every 30 s instead of crash-looping, logs the real DB cause as `session.storage.ready`. (The "session table does not exist" errors on 10/5 and 10/7 were DB connection failures, not a missing table.)
- **Alerting (GCP `aod-production-510006`, not in repo):** email channel `notificationChannels/2847501256251355583`, log-based policy "AlleDrops quiz: server errors" (`alertPolicies/12399884260945739375`), Cloud Run severity>=ERROR, max 1 email / 30 min. Test email received 10/11.
- Issue #46 closed. Left: `app/lib/shopify/products.ts:46,53` still logs raw errors (product data only).
- Not Sentry on purpose: the 21 ads Sentry org has no BAA.

**Watch:** next cold start's logs for `session.storage.ready`.

---

**Written:** 2026-10-06, end of phase 08.1 execution (all 13 plans run)
**Repo:** `/Users/andrewskinner/Local Sites/alle-drops-quiz-app`
**Sister:** `/Users/andrewskinner/Local Sites/allergist-on-demand` (theme)
**Branch:** `thread-aod-retire-fly` (PR3: Fly artifacts removed, docs, 08.1-11/12/13 summaries)

---

## Current state (verified 2026-10-06)

| Surface | State |
|---|---|
| Cloud Run | `alle-drops-quiz-app`, us-east1, `https://alle-drops-quiz-app-502519175239.us-east1.run.app`, `/health` 200. Runbook: `docs/cloud-run.md`. |
| Cloud SQL | `aod-quiz-db` (PHI `alledrops_quiz`, sessions `shopify_sessions`; Session rows: 1). |
| Shopify store | **Owned by AOD.** Transfer accepted 2026-10-05 by info@allergistondemand.com. Owner William Miller, Basic plan. Andrew is a collaborator. The admin token's app ("Alledrops Quiz App", `gid://shopify/App/300360105985`) survived, no reinstall. Storefront quiz, TN/TX gates and admin app verified on the AOD store. |
| `1mzvmx-tf` | Cancelled by William; Shopify deactivates it 2026-10-31. |
| Fly | **Destroyed 2026-10-06**: app, `data` volume, and Tigris bucket `red-haze-2475`. No rollback to Fly exists now. |
| Dev project `alledrops-quiz` | Kept, test data only. Fly authorized network removed (none left). Non-expiring SA key deleted (0 user keys; SA kept for impersonation). `alledrops_dev` / `alledrops_app` passwords rotated into secrets `dev-db-alledrops-dev-password` / `dev-db-alledrops-app-password`; new dev password verified (`select 1`). |

**Requirements:** LAUNCH-04 done. LAUNCH-06 (store owned by AOD, app installed, Fly retired) is met in substance; close it when the phase is verified. LAUNCH-05 open (NPP, privacy policy, officers, training: AOD/counsel). LAUNCH-07 open (domain; now an external ALB in front of Cloud Run).

## Next steps

1. **Update your local `.env`** dev DB password: `gcloud --configuration=default secrets versions access latest --secret=dev-db-alledrops-dev-password --project=alledrops-quiz`.
2. **File the access-reduction issue yourself** (the classifier blocked Claude): "Reduce Andrew's standing access on aod-production-510006 after cutover (Playbook E.5)". Drop owner, cloudsql.client and DB-secret access; needs Robert.
3. Review and merge PR3, then run `/gsd-verify-work 08.1` (or the phase verifier) to close the phase and LAUNCH-06.
4. Tell William about the ongoing dependency: the "AlleDrops Quiz Production" app is still owned by the 21 ads Dev Dashboard org.
5. Still open from earlier: William's written OK for the Google Cloud BAA acceptance; Robert to rotate the Shopify (info@) and Google (hostmaster@) passwords and turn on 2-step; billing card ending 2478.
6. Optional cleanup, irreversible, ask first: uninstall legacy "AlleDrops Quiz Worker" (unreferenced); review the old Dev Dashboard "AlleDrops Quiz App" (May 7). **Do not** uninstall the store's "Alledrops Quiz App" custom app: it owns the admin token.
7. Before launch: Shopify sender email on an AOD domain, plus a counsel question on Shopify order emails (no BAA). Dependabot alerts on main.

## Gotchas learned this session

- `cloud-sql-proxy` uses Application Default Credentials, not `gcloud auth login`. Pass `--gcloud-auth`. In a `!` command, stop it with `PX=$!; ... kill ${PX}`; `kill %1` left a stale proxy holding the port.
- zsh does not word-split `$G`-style command variables; use a function `G(){ gcloud ... "$@"; }`. Always brace `${P}`.
- The auto-mode classifier blocks production DB reads, secret writes and IAM-detail issue bodies. Hand Andrew the `!` command.
