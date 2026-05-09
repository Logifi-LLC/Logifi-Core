# FCV Pilot Operations Runbook

Operational playbook for Gate B pilot onboarding, offboarding, incident handling, and evidence logging.

## 1) Roles and Contacts

- Pilot owner: `Name / email`
- Engineering owner: `Name / email`
- Support contact: `info@logifi.io`
- Security escalation (FCV policy): notify `security@flightcrewview.com` within 24h of confirmed token compromise

## 2) Tester Onboarding

For each tester:

1. Verify pilot eligibility and consent.
2. Add tester to allowlist/enabled cohort.
3. Send onboarding email with:
   - Pilot purpose and duration
   - Logbook-only scope reminder
   - How to connect FCV in-app
   - Support contact
4. Confirm successful OAuth connect.
5. Confirm at least one fetch/import run completed.

Onboarding checklist:

- [ ] Tester added to pilot cohort
- [ ] Welcome email sent
- [ ] FCV connect successful
- [ ] First import completed
- [ ] Any issues logged

## 3) Tester Offboarding

When pilot ends or tester exits:

1. Remove tester from pilot-enabled cohort.
2. Ask tester to disconnect FCV from the app (or force disconnect administratively).
3. Confirm FCV tokens removed for that account.
4. Mark offboarding completion in tracker.

Offboarding checklist:

- [ ] Access removed
- [ ] FCV tokens removed
- [ ] Exit notes captured

## 4) Incident Response (Token/Data Risk)

Trigger examples:
- Suspected unauthorized token access
- Unexpected token leakage in logs
- Mis-scoped access behavior

Response steps:

1. Contain: disable affected integration rows and revoke access where possible.
2. Scope: identify affected users and timeframe.
3. Recover: force re-authorization for impacted users.
4. Notify FCV security within 24h of confirmation with scope and remediation.
5. Document postmortem and corrective actions.

Incident log template:

| Incident ID | Detected | Severity | Affected Users | FCV Notified | Resolution |
|-------------|----------|----------|----------------|--------------|------------|
| INC-0001 | YYYY-MM-DD HH:MM UTC | Medium | 2 | Yes (YYYY-MM-DD HH:MM UTC) | Tokens revoked; re-auth completed |

## 5) Pilot Evidence Log (for Gate A bridge later)

Capture these weekly:

- Active testers count
- Successful imports count
- Failed imports and root causes
- Duplicate-prevention outcomes
- Crew review/manual resolution frequency
- Support tickets and time-to-resolution
- Security events (if any)

Weekly evidence table:

| Week | Active Testers | Imports Success | Imports Failed | Duplicate Issues | Notes |
|------|----------------|-----------------|----------------|------------------|-------|
| YYYY-W## | 0 | 0 | 0 | 0 | |

## 6) Pilot Closeout

- [ ] Final metrics summary prepared
- [ ] Compliance deltas captured
- [ ] FCV feedback integrated into backlog
- [ ] Reusable evidence archived for future Gate A submission
