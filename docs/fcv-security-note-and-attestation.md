# FCV partner security note & logbook-only attestation (drafts)

**Product:** Logifi  
**Policy:** Flight Crew View Logbook API Access Policy v1.1 (§7–8)

These are **drafts** for you to customize, have reviewed by counsel if needed, and send to FCV with your tier application.

---

## A. Security note (short form)

**Authentication.** Logifi uses Flight Crew View’s OAuth 2.0 authorization code flow. Users authenticate on FC View; Logifi’s **server** exchanges the authorization code for access and refresh tokens. Authorization codes and tokens are **not** exposed to the browser client.

**Storage.** FC View access and refresh tokens are stored in our database (`fcv_integrations`), scoped to the Logifi user who completed OAuth. Database access is restricted via Supabase Row Level Security and server-side service role only where required for token exchange and refresh. We apply standard cloud provider encryption at rest (via Supabase / hosting provider).

**Rotation.** When FC View returns new tokens, we replace the stored token pair so the latest credentials are always in use.

**Least privilege.** Only backend routes that implement FC View import read FC View tokens. Operational staff do not routinely access raw tokens.

**Logging.** We log API success/failure as appropriate for debugging; we do not log authorization codes, refresh tokens, or passkeys.

**Incident response.** If we suspect token compromise, we will revoke or delete affected integration rows, force re-authorization, and notify FCV at security@flightcrewview.com within 24 hours of confirmation, with scope and remediation steps, per policy §7.4.

**AI / LLM.** We do not send FC View tokens, authorization codes, or passkeys to any AI provider. If we later use AI on **historical** logbook text for permitted workflows only, we will disclose that in the Privacy Policy and Data Sources page per §7.6.

---

## B. Logbook-only attestation (one paragraph)

**Attestation.** Logifi uses the Flight Crew View Logbook API **only** for logbook-centric workflows: importing, normalizing, de-duplicating, and displaying the **end user’s own** flight history for record-keeping. We do **not** use FC View data or the API for flight planning, dispatch, weather or NOTAM briefing, go/no-go decisions, live operational monitoring, or any operational purpose. We do **not** combine FC View logbook data with operational documents or real-time operational feeds to produce briefs or decision aids. We will display the required non-affiliation and subscription disclaimers on our marketing, pricing, pre-connect, and legal surfaces.

**Signature block (for PDF / email):**  
Name, title, company, date

---

## C. Optional: pricing honesty (free product)

Logifi is **free during beta**; we publish `/pricing` with $0, and we state that future paid plans would disclose auto-renew, trial end behavior, cancellation path, and refunds before charging. We do not use dark patterns to obscure pricing.
