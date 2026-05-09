# FCV Indie readiness — Phases 2–6 (Logifi)

Cross-reference: Flight Crew View Logbook API Access Policy v1.1. Phase 1 (Gate A) is documented separately in [fcv-gate-a-evidence-pack.md](./fcv-gate-a-evidence-pack.md).

---

## Phase 2 — Public presence and transparency

| Requirement | Status | Evidence / location |
|---------------|--------|---------------------|
| Public website | Pass | [logifi.io](https://www.logifi.io) (marketing); app routes in `logifi.web/app/pages/` |
| Terms of Service | Pass | [/terms](/terms) — `logifi.web/app/pages/terms.vue` |
| Privacy Policy | Pass | [/privacy](/privacy) — `logifi.web/app/pages/privacy.vue` |
| FC View value-add described | Pass | [/integrations](/integrations) — `integrations.vue` |
| Public pricing (amounts, interval, auto-renew, trial, cancel, refund) | Pass | [/pricing](/pricing) — `pricing.vue` (free beta articulated) |

**Gaps to watch**

- App Store listing copy (when native apps ship): paste the three verbatim disclaimers into store descriptions per policy §5.2.
- Keep legal effective/updated dates and support contacts current across Terms/Privacy/Data Sources.

---

## Phase 3 — Branding and disclaimers (§5.1 verbatim)

Required strings (exact):

1. Uses the Flight Crew View Logbook API. Not affiliated with Flight Crew View.
2. For logbook purposes only. Not for flight planning or operational use.
3. Requires an active Flight Crew View subscription (sold separately).

| Placement (§5.2) | Implementation |
|------------------|----------------|
| Primary marketing page for integration | `app/pages/integrations.vue` (above fold) via `FcvApiDisclaimers` |
| Main pricing page | `app/pages/pricing.vue` — intro links to `/integrations` for verbatim FCV notices (duplicate UI removed); confirm with FCV if link-only satisfies §5.2 for your tier |
| Pre-connect / pre-OAuth | `app/components/fcv/FcvSync.vue` (before Connect button); dashboard fetch panel includes same component |
| In-app Legal / Data sources | `app/pages/terms.vue` §12; `app/pages/data-sources.vue`; links from landing footer and dashboard |

Shared component: `app/components/fcv/FcvApiDisclaimers.vue`.

---

## Phase 4 — Technical readiness (§8.1 Step 2)

Use this as your demo / review checklist against the **synthetic test dataset** before production approval.

| Item | Notes / where |
|------|----------------|
| OAuth 2.0 authorization code, server-side | `server/api/fcv/auth.get.ts`, `callback.get.ts` — code exchange and token storage server-side; comment in callback |
| Token storage per user | `fcv_integrations` Supabase table (see callback handler) |
| `/flights` usage | `fetch.post.ts` (and map utilities) |
| `fcv_flight_id` / idempotent import | `import.post.ts` — deduplicates by `fcv_flight_id` |
| Deadhead / schedule options | `FcvSync.vue` body flags; verify mapping in `fcvMap` utilities |
| Time zones / overnight | Confirm with FCV test dataset scenarios (document results in demo notes) |
| Rate limits / backoff | Pass | `server/utils/fcvRetryFetch.ts` — `fetchFcvWithRetry` on `/flights` (`fetch.post.ts`), OAuth token exchange (`callback.get.ts`), token refresh (`fcvToken.ts`); tests in `server/utils/__tests__/fcvRetryFetch.test.ts` |
| Automated polling | Policy: max ~1/day per user for automated sync; current UI is user-initiated fetch |

**Demo artifact (to produce):** short screen recording — connect → fetch preview → import → repeat import without duplicates.

---

## Phase 5 — Security note and attestation

Draft templates: [fcv-security-note-and-attestation.md](./fcv-security-note-and-attestation.md).

---

## Phase 6 — Submission bundle index

When emailing FCV (Indie or Pilot), attach or link:

1. Gate A evidence pack (or Pilot request stating Gate A not yet met).
2. URLs: `/integrations`, `/pricing`, `/terms`, `/privacy`, `/data-sources`.
3. Screenshots of pre-connect UI with disclaimers (settings + optional dashboard panel).
4. Security note + logbook-only attestation (signed PDF or letter OK if they require).
5. Technical demo video + bullet list of §8.1 mapping behaviors.
6. Pilot-only: tester list, duration, confirmation of no public marketing of integration during pilot.
7. Pilot package docs: `fcv-gate-b-pilot-request.md`, `fcv-gate-b-artifact-pack.md`, `fcv-gate-b-submission-checklist.md`, `fcv-pilot-operations-runbook.md`.

---

## File map (this repo)

| Path | Purpose |
|------|---------|
| `logifi.web/app/components/fcv/FcvApiDisclaimers.vue` | Verbatim §5.1 block |
| `logifi.web/app/pages/integrations.vue` | Integration marketing |
| `logifi.web/app/pages/pricing.vue` | Pricing transparency |
| `logifi.web/app/pages/data-sources.vue` | Legal / data sources |
| `logifi.web/server/api/fcv/*.ts` | OAuth + API proxy |
| `docs/fcv-gate-a-evidence-pack.md` | Phase 1 |
