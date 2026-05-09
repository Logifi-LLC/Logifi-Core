# FCV Indie Tier — Phase 1 (Gate A) Evidence Pack

**Product under review:** Logifi (pilot digital logbook)  
**Policy reference:** Flight Crew View Logbook API Access Policy v1.1 — Section 8.0 Gate A  
**Evidence assembled:** 2026-04-16  
**Repository context:** [Logifi-Core](https://github.com/) — Nuxt 3 web app (`logifi.web`), Supabase backend; no native iOS/Android app project present in-tree.

---

## Final recommendation

**Gate A status: Not met**

Pursue **Pilot allowlist / Gate B (Section 8.3)** with FCV while continuing product work, **unless** you first ship matching **public** iOS and Android store listings for the same Logifi app and later re-run Gate A after **12+ months** public availability and an adoption signal.

---

## Gate A scorecard

| Criterion | Result | Notes |
|-----------|--------|--------|
| **A.1 Public availability (two platforms)** | **Gap** | No verified Apple App Store or Google Play listing was found for a **Logifi** pilot logbook app. Public surface is **web** ([logifi.io](https://www.logifi.io)) described as beta. Repository indicates a **web** stack only (no Capacitor/Cordova/React Native wrapper found at repo root). |
| **A.2 Minimum age (≥12 months public)** | **Gap** | Depends on A.1. Without public native listings, there is no defensible store “first release” date for Gate A. |
| **A.3 Adoption signal (any one)** | **Gap** | No combined app-store ratings/reviews for a Logifi mobile app were identified. Alternative signals (community, FCV-verified) were not submitted for this packet; Discord is referenced from the open-source README but is not a substitute for the written Gate A options without FCV agreement. |

**Decision rule (policy):** Pass only if A.1 + A.2 + A.3 are all satisfied → **Fail.**

---

## Evidence index

Use this table as the cover sheet for FCV. Replace “Desk research” rows with **screenshots** when you have live store listings.

| ID | Gate | Evidence type | Source / artifact | Verification notes |
|----|------|---------------|-------------------|---------------------|
| E1 | A.1 | Public marketing | [https://www.logifi.io](https://www.logifi.io) | Site states beta; describes pilot logbook; **no** App Store / Play badges or store URLs observed on fetched homepage content (2026-04-16). |
| E2 | A.1 | Codebase | `README.md` — stack lists Nuxt, Vue, Supabase; community links to [https://www.logifi.io](https://www.logifi.io) and Discord | Confirms **web** positioning; does not assert native store apps. |
| E3 | A.1 | Codebase | No `capacitor.config.*` / typical native wrapper at repo root | Supports conclusion that this repo is not currently a shipped iOS/Android app bundle. |
| E4 | A.1 | Desk research | Apple: `site:apps.apple.com logifi` — no Logifi pilot logbook listing in results (similar names are other products, e.g. “Logify”) | **Not** primary legal proof; FCV will expect **your** listing URLs. Re-run before submit. |
| E5 | A.1 | Desk research | Google: `site:play.google.com logifi logbook` — no Logifi pilot logbook listing identified | Same caveat as E4. |
| E6 | A.2 | *Planned* | Suggested screenshots: `gate-a-ios-release-date.png`, `gate-a-android-release-date.png` | Capture from each store’s “Information” / release section once listings exist. |
| E7 | A.3 | *Planned* | Suggested screenshots: `gate-a-ios-ratings.png`, `gate-a-android-ratings.png` (or community evidence pack) | Show **≥50** combined ratings/reviews **or** agreed alternative per policy. |

---

## Suggested next steps (operational)

1. **If targeting Indie without Pilot:** Ship **the same** Logifi app on **both** App Store and Google Play; document first public release dates; grow to an adoption signal that meets Section 8.0; then re-submit Gate A evidence.
2. **If timelines matter:** Email FCV to request **Pilot Access (Gate B / 8.3)** with this packet, a short product description, and a proposed tester list — acknowledging Gate A is not yet met.
3. **Before any FCV submission:** Replace desk-research notes (E4–E5) with **live URLs** and **screenshots** for your actual listings to avoid ambiguity.

---

## Logbook-only attestation (placeholder for Phase 2+)

*Not required for Phase 1 completion.* When you submit to FCV, you will still need the separate **logbook-only attestation** and disclaimer placements per Sections 5 and 8.1; this document addresses **Gate A only**.
