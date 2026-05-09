# FCV Gate B Pilot Request Package (Pilot Way)

Use this document as the source of truth for your Gate B request narrative and submission email.

## 1) Request Positioning

- Request type: Gate B / Pilot allowlist (FCV policy section 8.3 path).
- Gate A status: Not yet met.
- Product scope: Logifi is a pilot logbook product.
- FCV API usage scope: Logbook import, normalization, deduplication, and display of user-owned history only.
- Non-goals: No flight planning, dispatch, weather briefing, NOTAM briefing, go/no-go, or operational decision support.

## 2) Pilot Scope and Guardrails

- Audience: Controlled pilot cohort only (allowlisted testers).
- Marketing: No broad public marketing of FCV integration during pilot.
- Access control: FCV integration enabled only for approved pilot users.
- Data handling: OAuth authorization code flow; token exchange and refresh on server only.
- Support path: Product support via `info@logifi.io`; security incidents via `security@flightcrewview.com` notification path in under 24h after confirmation.

## 3) Pilot Timeline and Cohort

Fill in these fields before sending:

- Pilot start date: `YYYY-MM-DD`
- Pilot end date: `YYYY-MM-DD`
- Planned duration: `N` weeks
- Initial tester count: `N`
- Max tester count during pilot: `N`
- Tester profile: (for example) active pilots validating FCV import quality and logbook workflows

## 4) Email Draft (Copy/Paste)

Subject: `Logifi - FCV Gate B Pilot Request (Logbook API)`

Hello Flight Crew View team,

We are requesting Gate B pilot access for Logifi under the FCV Logbook API policy (pilot path, section 8.3). Gate A is not yet met, and we are intentionally requesting a controlled pilot.

Logifi is a digital pilot logbook. Our FCV integration is limited to logbook workflows: importing, normalizing, deduplicating, and displaying each user's own flight history. We do not use FCV data for flight planning, dispatch, weather/NOTAM briefing, go/no-go decisions, or operational use.

Pilot scope:
- Duration: `<start>` to `<end>` (`<N>` weeks)
- Testers: `<initial N>` initial, up to `<max N>` max
- Distribution: allowlisted pilot users only
- Marketing: no broad public promotion of FCV integration during pilot

Attached/linked in this package:
- Legal/compliance URLs and screenshots (`/integrations`, `/pricing`, `/terms`, `/privacy`, `/data-sources`, pre-connect UI)
- Security note and logbook-only attestation
- Technical demo evidence (connect -> fetch preview -> import -> re-import dedupe)
- Pilot tester roster and operational contacts

Please let us know if you prefer any additional evidence format or wording adjustments.

Thank you,
`<name>`
`<title>, Logifi`
`<email>`
`<phone optional>`

## 5) Attachments Index

- `docs/fcv-gate-a-evidence-pack.md`
- `docs/fcv-security-note-and-attestation.md` (signed export attached separately)
- `docs/fcv-gate-b-artifact-pack.md`
- `docs/fcv-gate-b-submission-checklist.md`
- `docs/fcv-pilot-operations-runbook.md`
