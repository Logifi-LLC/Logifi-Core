# iOS TestFlight release guide

End-to-end checklist for shipping Logifi on TestFlight. The app is **Capacitor 8** wrapping a **Nuxt 4** static bundle (`io.logifi.app`).

## Phase 0 — Local iOS baseline (do this before TestFlight)

**Always sync web assets before Xcode Run.** Xcode alone does not rebuild the Nuxt bundle.

```bash
cd /path/to/Logifi-Core
npm run cap:sync          # nuxt generate + copy to ios/App/App/public
# Then: Xcode → Product → Clean Build Folder → Run
```

Or use the all-in-one dev command:

```bash
npm run cap:run:ios
```

### Debug on device

1. iPhone → Settings → Safari → **Advanced → Web Inspector** (on)
2. Mac Safari → **Develop → [your iPhone] → Logifi**
3. After login, watch Console for:
   - `[LoadEntries] Loaded N entries from IndexedDB`
   - `[LoadEntries] Fetching remote logbook for user …`
   - `[LoadEntries] Merged entries: N entries`
   - `[LoadEntries] IndexedDB persist complete` (may appear shortly after merge)
   - **No** `Gesture: System gesture gate timed out` within ~5s of merge
   - Totals populate within ~1–2s; catalog/settings/FAB taps work; logbook shows first page (~100 cards) and **auto-loads more as you scroll**

### Verify cloud data (not just local cache)

Supabase dashboard → `log_entries` → filter by your `user_id`.

- **0 rows:** entries were local-only; use web app export/import or sync from another device
- **1500+ rows:** app should download progressively; use Settings → Sync if needed

### Incremental TestFlight rollout

After local iOS works, enable TestFlight pieces **one at a time** (`cap:sync` + device test after each):

1. `NUXT_PUBLIC_API_BASE` + Digifi/FC View API calls
2. Supabase + Google redirect URLs for native auth
3. Release archive + Privacy manifest (native only)

---

- Mac with Xcode 15+ and an Apple Developer Program membership ($99/year)
- Production web backend deployed with Nitro `/api/*` routes (see [Production backend](#production-backend))
- `logifi.web/.env` with production values before `npm run cap:sync`

---

## Phase 1 — Apple Developer & App Store Connect

### 1.1 Apple Developer Program

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs)
2. Use the Apple ID tied to team **6VTFG8AC7Y** (already in the Xcode project) when possible
3. Allow 24–48 hours for new account approval

### 1.2 Register App ID

1. [Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Confirm **App ID** `io.logifi.app` exists (matches `capacitor.config.json`)
3. Enable **Sign In with Apple** on that App ID (required for Guideline 4.8 — see [apple-sign-in-setup.md](./apple-sign-in-setup.md))
4. Camera access is declared in `Info.plist` (`NSCameraUsageDescription`) — no App ID toggle required

### 1.3 App Store Connect app record

1. [App Store Connect → Apps → +](https://appstoreconnect.apple.com)
2. Platform: **iOS**, name: **Logifi**, bundle ID: `io.logifi.app`
3. SKU: e.g. `logifi-ios-001`
4. Complete **App Privacy** (mirror [privacy policy](https://www.logifi.io/privacy): account data, logbook entries, Digifi images, FC View OAuth tokens)

### 1.4 Signing

Xcode target **App** → Signing & Capabilities → Team = your developer team. Automatic signing creates distribution certificates on first archive.

---

## Phase 2 — Production backend

The iOS app uses `nuxt generate` (static). Server routes under `logifi.web/server/api/` are **not** in the bundle. Deploy the full Nuxt app so APIs are reachable at your production domain.

### Deploy on Vercel

1. Connect the repo; set **Root Directory** to `logifi.web`
2. Use `nuxt build` (default via `vercel.json`) — **not** static export only
3. Set all env vars from `logifi.web/env.example` for Production (and Preview if needed)
4. Verify: `curl -I https://www.logifi.io` and authenticated `GET /api/fcv/status`

### Required env vars (minimum)

| Variable | Purpose |
|----------|---------|
| `NUXT_PUBLIC_SUPABASE_URL` | Client auth + data |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Digifi uploads, FC View token storage, credits |
| `FCV_*` | FC View OAuth + API |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Digifi scanning |
| Stripe / Lightning keys | Credits checkout (optional if mock disabled) |

---

## Phase 3 — iOS build configuration

### 3.1 Environment for `cap:sync`

In `logifi.web/.env` before building:

```bash
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NUXT_PUBLIC_API_BASE=https://www.logifi.io
```

### 3.2 Supabase redirect URLs

Supabase → Authentication → URL Configuration → **Redirect URLs**:

```
https://localhost/auth/callback
https://localhost/reset-password
io.logifi.app://auth/callback
io.logifi.app://reset-password
```

**Site URL** can stay `https://www.logifi.io`.

### 3.3 Google OAuth (if using Continue with Google)

Add the same redirect URLs to the Google Cloud OAuth client authorized redirect URIs.

### 3.4 Build & sync

```bash
# From repo root (first time or when aircraft DB updates)
npm run update-aircraft-db --prefix logifi.web

# Production iOS bundle
npm run cap:sync
npm run cap:open:ios
```

Release builds use `ios/release.xcconfig` (`CAPACITOR_DEBUG = false`). Debug uses `ios/debug.xcconfig`.

---

## Phase 4 — Compliance

| Item | Status in repo |
|------|----------------|
| `NSCameraUsageDescription` | `ios/App/App/Info.plist` |
| Privacy Manifest | `ios/App/App/PrivacyInfo.xcprivacy` |
| URL scheme `io.logifi.app` | `Info.plist` → `CFBundleURLTypes` |
| Export compliance | On upload: **No** proprietary encryption (standard HTTPS/TLS only) |

FC View verbatim disclaimers for App Store listing: see `docs/fcv-indie-readiness-phases-2-6.md`.

---

## Phase 5 — Archive & upload

1. Xcode → select **Any iOS Device (arm64)**
2. **Product → Archive** (Release configuration)
3. **Organizer → Distribute App → App Store Connect → Upload**
4. **Increment build number** (`CURRENT_PROJECT_VERSION` in Xcode) for every upload — currently starts at **3**

Processing in App Store Connect: ~5–30 minutes.

---

## Phase 6 — TestFlight

### Internal testing (start here)

- App Store Connect → TestFlight → **Internal Testing**
- Add team members (up to 100); no Beta App Review required
- Install **TestFlight** on iPhone → accept invite → install Logifi

### External testing

- Create group (e.g. "Logifi Beta")
- Add testers by email or public link
- Fill **Test Information** and **What to Test**
- Submit for **Beta App Review** (first external build per version; ~24–48 hours)

Tester instructions: [ios-testflight-tester-guide.md](../logifi.web/docs/ios-testflight-tester-guide.md)

### Regression checklist (device)

- [ ] Email sign-up / sign-in / sign-out
- [ ] Google OAuth sign-in
- [ ] Password reset email → app opens reset flow
- [ ] Logbook CRUD + offline sync
- [ ] Aircraft lookup (offline bundled DB)
- [ ] Digifi Eye QR scan + capture upload
- [ ] FC View connect → fetch → import
- [ ] Credits balance / checkout (if enabled in prod)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Updated list with error: DownloadFailed` / missing icons | Icons must be bundled for Capacitor (`icon.serverBundle: false` in `nuxt.config.ts`). Run `npm run cap:sync` from repo root, then **Product → Clean Build Folder** in Xcode and reinstall |
| App feels frozen with 1000+ entries on iOS | iOS uses display-windowed log cards (infinite scroll, ~100/page). Rebuild after `cap:sync` if you still see all entries at once |
| Cannot scroll / taps ignored on iOS | Pull-to-refresh removed on iOS; entry form no longer auto-opens on empty logbook. Run `cap:sync`, clean Xcode build, reinstall |
| Stuck on "Syncing logbook" | Check Safari console for `[LoadEntries] Merged entries`. Large logbooks sync in background — UI should stay interactive. Use Settings → Sync to force completion |
| `/api/*` 404 on device | Set `NUXT_PUBLIC_API_BASE` and rebuild with `cap:sync`; verify Vercel deploy uses `nuxt build` |
| Google OAuth does not return to app | Confirm Supabase + Google redirect URLs; custom scheme `io.logifi.app` in Info.plist |
| Email confirmation link opens browser only | Add `https://localhost/auth/callback` to Supabase redirects |
| Upload rejected (duplicate build) | Bump `CURRENT_PROJECT_VERSION` in Xcode |
| Digifi / FC View 503 | Server env vars missing on Vercel; redeploy |

---

## Versioning

| Field | Location |
|-------|----------|
| Marketing version (1.0) | Xcode `MARKETING_VERSION` |
| Build number | Xcode `CURRENT_PROJECT_VERSION` — increment per TestFlight upload |
| Bundle ID | `io.logifi.app` |
