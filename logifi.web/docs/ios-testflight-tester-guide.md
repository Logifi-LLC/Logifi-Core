# Logifi iOS TestFlight tester guide

Use this after you receive a TestFlight invite for **Logifi** (`io.logifi.app`).

## Install

1. Install [TestFlight](https://apps.apple.com/app/testflight/id899247664) from the App Store
2. Open the invite email or link on your iPhone
3. Tap **Accept** → **Install** in TestFlight
4. Open **Logifi** from the TestFlight app or your home screen

## Sign in

- **Email + password** — create an account or sign in with existing Logifi credentials
- **Continue with Google** — uses Safari; you return to the app after approving access

If sign-in fails, force-quit Logifi and TestFlight, then retry. Send feedback with the exact step that failed.

## What to test

### Core logbook

- [ ] Add, edit, and delete logbook entries
- [ ] Search and filter entries
- [ ] Export (if you use it on web)

### Digifi (paper scanning)

- [ ] **Digifi Eye** — scan QR from Add Pages on desktop, capture logbook photos on phone
- [ ] Confirm photos appear on desktop and scans complete
- [ ] Credits decrease per spread (if credits enabled)

### FC View

- [ ] Settings → Data & Sync → connect FC View
- [ ] Fetch flights and import into logbook
- [ ] Repeat import — no duplicate entries for same FC View flight ID

### Offline

- [ ] Aircraft registration lookup works in airplane mode (bundled FAA database)

## Feedback

- **In TestFlight:** shake device → **Send Beta Feedback** (if enabled)
- **Email:** use the address listed in TestFlight **What to Test** notes
- Include: iOS version, iPhone model, steps to reproduce, screenshots

## Known expectations

- This is a **beta** build. Data should sync with the same account on [logifi.io](https://www.logifi.io).
- Terms: [/terms](https://www.logifi.io/terms) · Privacy: [/privacy](https://www.logifi.io/privacy)

## Troubleshooting

| Symptom | Try |
|---------|-----|
| “Network error” on Digifi / FC View | Confirm you have internet; production API may be updating |
| Google sign-in stuck | Force-quit app, retry; use email sign-in as fallback |
| QR scan fails | Settings → Logifi → allow Camera |
| Session expired (Digifi Eye) | Scan a fresh QR from desktop **Connect phone** |
