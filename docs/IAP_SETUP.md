# iOS In-App Purchase Setup Guide for Digifi Credits

This document describes the implementation of Apple IAP for Digifi credits and the required setup in App Store Connect.

---

## Overview

**Problem**: App Store rejected Logifi for Guideline 3.1.1/3.1.3(b) — Digifi credits are paid digital goods and must use StoreKit IAP on iOS, not web-based payment (Stripe/Lightning).

**Solution**: This PR implements StoreKit 2 IAP for iOS. Users on iOS buy fixed credit packs via Apple; web users continue using Stripe/Lightning unchanged.

---

## What Changed

### 1. Client (iOS/Web)

- **Platform detection**: `app/utils/platform.ts` — detects iOS native app vs web
- **IAP products catalog**: `app/utils/iapProducts.ts` — defines 5 consumable credit packs (25, 50, 100, 250, 500 credits)
- **IAP composable**: `app/composables/useIapPurchase.ts` — StoreKit 2 integration via `@capgo/native-purchases`
- **Modal update**: `app/components/digifi/DigifiAddCreditsModal.vue` — hides Stripe/Lightning on iOS, shows IAP packs

### 2. Server

- **Apple verification**: `server/utils/appleIapVerification.ts` — verifies JWS transactions using Apple's official library
- **Verify endpoint**: `server/api/credits/iap/verify.post.ts` — verifies receipt, grants credits idempotently
- **Tests**: `server/api/credits/__tests__/iap-verify.test.ts` — comprehensive test coverage

### 3. Dependencies

- **@capgo/native-purchases** (v8.7.0+) — Capacitor plugin for StoreKit 2 / Google Play Billing
- **@apple/app-store-server-library** (latest) — Official Apple library for receipt verification

---

## App Store Connect Setup (Required)

You must complete these steps in App Store Connect before users can purchase credits on iOS.

### Step 1: Create IAP Products

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **My Apps** → **Logifi** → **In-App Purchases**
3. Click **+** to create a new in-app purchase
4. Select **Consumable** (credits are consumed when used for Digifi scans)
5. Create **5 products** with these exact product IDs:

| Product ID                      | Display Name     | Price (USD) | Credits |
| ------------------------------- | ---------------- | ----------- | ------- |
| `io.logifi.app.credits.25`      | 25 Credits       | $12.50      | 25      |
| `io.logifi.app.credits.50`      | 50 Credits       | $25.00      | 50      |
| `io.logifi.app.credits.100`     | 100 Credits      | $50.00      | 100     |
| `io.logifi.app.credits.250`     | 250 Credits      | $125.00     | 250     |
| `io.logifi.app.credits.500`     | 500 Credits      | $250.00     | 500     |

**Pricing note**: Prices above are suggestions at ~$0.50/credit to match current Stripe pricing. Adjust as needed. The product IDs **must match exactly** — they are hardcoded in `app/utils/iapProducts.ts`.

6. For each product, fill in:
   - **Reference Name**: e.g., "25 Digifi Credits"
   - **Product ID**: Use exact IDs from table above
   - **Price**: Set your tier or custom price
   - **Localization**: Add at least English (US)
   - **Description**: e.g., "25 credits for Digifi logbook page scans"

7. **Submit for Review**: Each product must be submitted with an app binary before it goes live. You can create them now and they'll be reviewed when you submit the next app version.

### Step 2: Generate App Store Server API Key

The server needs an API key to verify receipts with Apple.

1. In App Store Connect, go to **Users and Access** → **Keys** → **In-App Purchase**
2. Click **Generate API Key**
3. Name it (e.g., "Logifi IAP Verification")
4. Download the `.p8` private key file — **you can only download it once**
5. Note the **Key ID** (e.g., `ABCDEFGHIJ`) and **Issuer ID** (UUID at the top of the Keys page)

### Step 3: Add Environment Variables to Server

Add these to your production server environment (Vercel, Render, etc.):

```bash
# Required for production
APPLE_IAP_ENVIRONMENT=production
APPLE_BUNDLE_ID=io.logifi.app
APPLE_APP_ID=<your_numeric_app_apple_id>
APPLE_IAP_KEY_ID=<your_key_id_from_step_2>
APPLE_IAP_ISSUER_ID=<your_issuer_id_from_step_2>
APPLE_IAP_PRIVATE_KEY=<contents_of_p8_file>

# For sandbox testing (TestFlight, Xcode)
# APPLE_IAP_ENVIRONMENT=sandbox
# (omit APPLE_APP_ID in sandbox mode)
```

**Finding your App Apple ID**:

1. Go to App Store Connect → My Apps → Logifi
2. Click **App Information** in the left sidebar
3. Look for **Apple ID** — it's a numeric ID like `123456789`

**Private key format**:

- The `.p8` file contents should be pasted as-is, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- OR encode as base64 and decode in code (current implementation expects raw PEM)

### Step 4: Xcode Configuration

1. Open the iOS project: `npx cap open ios`
2. Select the **App** target → **Signing & Capabilities**
3. Click **+ Capability** → add **In-App Purchase**
4. Ensure your signing team and provisioning profile are configured

### Step 5: Paid Applications Agreement

1. In App Store Connect, go to **Agreements, Tax, and Banking**
2. Complete the **Paid Applications** agreement if not already done
3. Add **banking information** and **tax forms**

Without this, IAP products won't work even if configured correctly.

---

## Testing

### Sandbox Testing (before production)

1. Create a **Sandbox Tester** account in App Store Connect:
   - Go to **Users and Access** → **Sandbox Testers**
   - Create a new tester with a unique email (can be fake, e.g., `test+iap@logifi.io`)
2. Set server environment to sandbox:

   ```bash
   APPLE_IAP_ENVIRONMENT=sandbox
   # Do NOT set APPLE_APP_ID in sandbox mode
   ```

3. Build and run on a device or simulator via Xcode
4. Sign in with the sandbox tester account when prompted
5. Purchase a credit pack — **you won't be charged**
6. Verify credits are added to your Logifi account

### Production Testing

1. Submit app binary with IAP products to App Review
2. Once approved, set server environment:
   ```bash
   APPLE_IAP_ENVIRONMENT=production
   APPLE_APP_ID=<your_app_apple_id>
   ```
3. Install production app from TestFlight or App Store
4. Make a real purchase — **you will be charged** (use Manage Subscriptions → Request Refund if testing)

---

## Implementation Details

### Product IDs and Pricing

The implementation uses **fixed consumable packs**. This is simpler for App Store approval than dynamic quantities:

- **Web**: User enters any credit amount (min 25 for Stripe, 1 for Lightning), pays $0.40-$0.50/credit
- **iOS**: User selects a pre-defined pack (25/50/100/250/500 credits), pays via Apple

If you want different pack sizes or pricing, edit `app/utils/iapProducts.ts` and create matching products in App Store Connect.

### Verification Flow

1. User selects a pack on iOS → taps "Purchase with Apple"
2. `useIapPurchase.purchaseProduct()` calls StoreKit 2 via `@capgo/native-purchases`
3. Apple processes payment, returns a **JWS transaction** (StoreKit 2 signed receipt)
4. Client POSTs to `/api/credits/iap/verify` with:
   - `productId`
   - `transactionId`
   - `jwsRepresentation` (StoreKit 2 JWS token)
5. Server verifies the JWS signature against Apple's root certificates
6. Server checks the transaction hasn't been used before (idempotent via `reference_id = apple:{transactionId}`)
7. Server credits the user's account via `grantCreditsIdempotent()`
8. Client updates UI and shows success

**Security**: The server **never trusts the client alone**. Every purchase is verified with Apple's servers before crediting.

### Offline Considerations

- IAP requires an active internet connection to complete the purchase
- If the app crashes after payment but before server verification, StoreKit 2 will retry on next launch
- The verification endpoint is idempotent — duplicate transaction IDs are ignored, so the user isn't double-charged

### Refunds

If a user requests a refund through Apple:

- Apple handles the refund
- `revocationDate` will be set in the transaction
- Current implementation checks `revocationDate` during verification and rejects refunded transactions
- **TODO for later**: Implement App Store Server Notifications to automatically deduct credits on refund

---

## File Reference

### New Files

- `app/utils/iapProducts.ts` — IAP product catalog
- `app/utils/platform.ts` — Platform detection
- `app/composables/useIapPurchase.ts` — IAP purchase logic
- `server/utils/appleIapVerification.ts` — Apple receipt verification
- `server/api/credits/iap/verify.post.ts` — Verification endpoint
- `server/api/credits/__tests__/iap-verify.test.ts` — Tests

### Modified Files

- `app/components/digifi/DigifiAddCreditsModal.vue` — UI changes for iOS
- `package.json` — Added `@capgo/native-purchases` and `@apple/app-store-server-library`

---

## What Derek Must Do

### Before Merging This PR

1. ✅ Review the code
2. ✅ Confirm pricing strategy (fixed packs vs dynamic amounts)
3. ✅ Merge to `dev`, do NOT merge to `main`

### Before iOS Release

1. **App Store Connect**:
   - Create 5 IAP products (see Step 1 above)
   - Generate App Store Server API key (see Step 2 above)
   - Complete Paid Applications agreement if not done
2. **Server Environment**:
   - Add environment variables (see Step 3 above)
   - Test in sandbox mode first
3. **Xcode**:
   - Add In-App Purchase capability (see Step 4 above)
4. **Build & Test**:
   - `npm run cap:sync` to sync the new plugin
   - Build with Xcode
   - Test IAP flow in sandbox mode
   - Submit to App Review with IAP products included

---

## Known Limitations / Future Work

### This PR Does NOT Include

- **Restore Purchases UI**: The code includes a `restorePurchases()` function (required by Apple), but no UI button yet. Add one in Settings if needed (consumables typically can't be restored, but Apple requires the API).
- **App Store Server Notifications**: Apple can send webhooks for events like refunds, subscription renewals (not applicable here), etc. Not implemented yet. For now, refunds are detected only at next verification.
- **Android Google Play Billing**: The plugin supports Android, but Android doesn't have the same 3.1.1 restriction. We can add Android IAP later if desired.
- **Subscription Model**: Current implementation is consumable credits. If you later want a subscription (e.g., unlimited Digifi scans), use a different product type (`SUBS` instead of `INAPP`).

### Cannot Test Without Mac

- The IAP flow **requires a Mac with Xcode** to build and test on iOS
- The plugin is configured, but `npx cap sync ios` was skipped because it requires a built web app
- Run `npm run cap:sync` locally to sync the plugin to Xcode

---

## Troubleshooting

### "Product not found" on iOS

- Products must be **submitted for review** and **approved** (or in sandbox mode with sandbox tester signed in)
- Check product IDs match exactly (case-sensitive)
- Wait a few minutes after creating products — sometimes it takes time to propagate

### "Receipt verification failed"

- Check environment variables are set correctly
- Sandbox vs production mismatch: use `APPLE_IAP_ENVIRONMENT=sandbox` for TestFlight
- Private key must be valid PEM format from the `.p8` file

### "Transaction already processed"

- This is expected behavior (idempotency) — the user won't be double-charged
- The endpoint checks `reference_id` in the database to prevent duplicate credits

### "Invalid signature"

- Apple Root CA certificates in `appleIapVerification.ts` might need updating
- Download latest from https://www.apple.com/certificateauthority/
- Current implementation embeds AppleRootCA-G3 and AppleIncRootCertificate

---

## Resources

- [App Store Server API Documentation](https://developer.apple.com/documentation/appstoreserverapi)
- [StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Server Library (Node.js)](https://github.com/apple/app-store-server-library-node)
- [@capgo/native-purchases Plugin](https://github.com/Cap-go/capacitor-native-purchases)
- [Apple's In-App Purchase Guidelines](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)

---

**Questions?** Ping Derek or consult the Apple docs. This implementation follows Apple's best practices and uses their official verification library.
