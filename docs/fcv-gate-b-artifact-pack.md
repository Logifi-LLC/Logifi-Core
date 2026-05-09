# FCV Gate B Artifact Pack Checklist

This checklist tracks all artifacts needed for FCV Gate B (Pilot) submission.

## A. URL Evidence (copy these into submission email)

- Marketing integration page: `https://www.logifi.io/integrations`
- Pricing page: `https://www.logifi.io/pricing`
- Terms page: `https://www.logifi.io/terms`
- Privacy page: `https://www.logifi.io/privacy`
- Data sources page: `https://www.logifi.io/data-sources`
- In-app pre-connect surface: Data and Sync (FCV connect panel)

## B. Screenshot Evidence (required)

Capture these in light mode, then repeat in dark mode where relevant.

- `fcv-gateb-integrations-page.png`
- `fcv-gateb-pricing-page.png`
- `fcv-gateb-terms-page-fcv-notices.png`
- `fcv-gateb-privacy-page-fcv-section.png`
- `fcv-gateb-data-sources-page.png`
- `fcv-gateb-preconnect-ui-settings.png`
- `fcv-gateb-preconnect-ui-dashboard.png` (if dashboard connect panel is part of pilot UX)

Capture notes:
- Keep browser URL bar visible for public URLs.
- Ensure FCV disclaimer wording is fully visible and verbatim.
- If page content is long, include both full-page and focused crop.

## C. Demo Video Evidence (required)

Filename: `fcv-gateb-demo-connect-fetch-import-dedupe.mp4`

Record this exact flow:
1. Start from disconnected state.
2. Connect FCV via OAuth.
3. Fetch by date range and show preview list.
4. Import flights successfully.
5. Repeat same import and show idempotent behavior (duplicates skipped/no duplicate rows created).
6. Optional: disconnect flow from data sources page.

Target duration: 2-5 minutes.

## D. Signed Documents (required)

- `fcv-security-note-signed.pdf`
- `fcv-logbook-only-attestation-signed.pdf`

Source draft: `docs/fcv-security-note-and-attestation.md`

## E. Pilot Ops Attachments (required for Gate B)

- `fcv-pilot-tester-roster.csv`
- `fcv-pilot-contacts.md` (product + security + escalation)
- `fcv-pilot-timeline.md` (start, milestones, end)
- `fcv-pilot-no-public-marketing-statement.md`

## F. Ready-to-Send Validation

Before send, confirm all are true:

- [ ] All five public URLs resolve in production.
- [ ] FCV disclaimer text is verbatim and visible.
- [ ] Demo video includes dedupe/idempotency behavior.
- [ ] Signed security and attestation docs attached.
- [ ] Tester list and pilot duration included.
- [ ] Submission email uses the Gate B framing (Gate A not yet met).
