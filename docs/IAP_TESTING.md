# iOS IAP Testing Checklist

This file tracks manual testing tasks that require Derek to complete with Xcode/Mac.

## Prerequisites (Derek must complete)

- [ ] App Store Connect products created (5 consumable credit packs)
- [ ] App Store Server API key generated and downloaded
- [ ] Environment variables configured on server
- [ ] Paid Applications agreement completed in App Store Connect

## Build & Xcode Setup

- [ ] Run `npm install` to ensure all dependencies are present
- [ ] Run `npm run cap:sync` to sync Capacitor plugins to iOS project
- [ ] Open Xcode: `npx cap open ios`
- [ ] Add In-App Purchase capability in Xcode (Signing & Capabilities tab)
- [ ] Verify `@capgo/native-purchases` plugin appears in Xcode project

## Sandbox Testing

- [ ] Create sandbox tester account in App Store Connect
- [ ] Set server environment to sandbox mode (`APPLE_IAP_ENVIRONMENT=sandbox`)
- [ ] Build and run on iOS simulator or device via Xcode
- [ ] Open Digifi credits modal in app
- [ ] Verify IAP credit packs are displayed (not Stripe/Lightning)
- [ ] Verify App Store prices load for each pack
- [ ] Select a pack and tap "Purchase with Apple"
- [ ] Complete sandbox purchase (sign in with sandbox tester)
- [ ] Verify credits are added to account
- [ ] Verify transaction appears in credits history
- [ ] Test idempotency: Force re-verify same transaction → no double-credit
- [ ] Check server logs for successful verification

## Production Testing (After App Review Approval)

- [ ] Set server environment to production mode (`APPLE_IAP_ENVIRONMENT=production`)
- [ ] Set `APPLE_APP_ID` in server environment
- [ ] Install production build (TestFlight or App Store)
- [ ] Make a real purchase (will be charged)
- [ ] Verify credits are added
- [ ] Request refund if testing only

## Error Cases to Test

- [ ] No internet connection → graceful error
- [ ] Invalid/expired sandbox account → clear error message
- [ ] Server environment variables missing → 503 error
- [ ] Product not found in App Store Connect → "Not available" shown

## Web Testing (Should Be Unchanged)

- [ ] Open web app (not iOS native)
- [ ] Open Digifi credits modal
- [ ] Verify Stripe/Lightning options still appear
- [ ] Verify no IAP packs shown on web
- [ ] Complete a Stripe purchase → credits added
- [ ] Complete a Lightning purchase → credits added

---

## Notes

- Consumable products (credits) typically cannot be restored, but Apple requires `restorePurchases()` API
- Consider adding a "Restore Purchases" button in Settings (UI not implemented yet)
- JWS verification uses embedded Apple Root CA certificates; update from https://www.apple.com/certificateauthority/ if expired

## Blockers

If any tests fail, check:

1. **Product IDs match exactly**: `io.logifi.app.credits.{25,50,100,250,500}`
2. **Environment variables set**: See `docs/IAP_SETUP.md` Step 3
3. **Xcode capability added**: In-App Purchase must be enabled
4. **Sandbox tester signed in**: Use sandbox account for testing, not your Apple ID
5. **Server logs**: Check for verification errors in production logs
