# iOS IAP Fix - Post-Merge Instructions

## What was fixed

PR fixes the iOS Digifi "Add Credits" showing all packs as "Not available" after PRs #46/#48.

### Root causes
1. `ios/App/CapApp-SPM/Package.swift` was missing `@capgo/native-purchases` dependency and product, so the native plugin wasn't linked to the iOS app
2. `useIapPurchase.ts` used a fragile dynamic string-joined import that could fail in the iOS Capacitor WebView

### Changes made
1. Added `@capgo/native-purchases` to `Package.swift` dependencies and products (matching pattern used for other Capgo plugins)
2. Replaced dynamic string import with Capacitor's official `registerPlugin` API, which reliably loads native bridges on iOS
3. Web builds still work - the native import only executes when `isIosApp()` returns true (iOS native), never on Vercel web builds

## Required action after merge

**Derek must run:**
```bash
npx cap sync ios
```

This command:
- Updates the Xcode project with the new Package.swift dependencies
- Links the native-purchases Swift package
- Syncs web assets to iOS

After `cap sync ios`, rebuild the iOS app in Xcode or via `npm run cap:run:ios`.

## Verification
Test on iOS Simulator or device:
1. Sign in to Logifi
2. Navigate to Digifi → Add Credits
3. Credit packs should now show prices from App Store (e.g. "$9.99", "$19.99")
4. Xcode console should NOT show "[iap] Failed to load native purchases module"
