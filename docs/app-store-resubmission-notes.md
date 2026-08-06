# App Store resubmission — 4.8 + 5.1.1(v)

Use after shipping Sign in with Apple and in-app account deletion.

## Before you upload

1. Complete [Sign in with Apple portal setup](./apple-sign-in-setup.md) (Apple Developer + Supabase provider).
2. Apply DB migration `20240101000073_account_deletion_purge.sql` to production Supabase.
3. Deploy the Nitro API so `POST /api/account/delete` is live (`NUXT_PUBLIC_API_BASE` for the iOS app).
4. `npm run cap:sync` → Archive → TestFlight → verify on a physical iPhone and iPad.

## Screen recording (required for App Review Notes)

Record on a **physical device** (not Simulator), showing:

1. Create a new account **or** sign in with the demo account
2. Open **Settings → Account**
3. Tap **Delete account**
4. Type `DELETE` → tap **Delete forever**
5. Confirm you land back on the sign-in screen

Attach the video in App Store Connect → the app version → **App Review Information → Notes** (or reply to the rejection thread with the recording).

## Suggested App Review reply

```
Hello App Review,

Thank you for the feedback on submission 3451b844-9727-40de-97dd-4562d85448d6.

Guideline 4.8 — Login Services
We now offer Sign in with Apple as an equivalent login option alongside Google.
On iOS it uses the native Sign in with Apple sheet; it limits data to name/email
(with Apple's Hide My Email), and does not collect interactions for advertising.

Guideline 5.1.1(v) — Account Deletion
Users can permanently delete their account in-app:
Settings → Account → Delete account (type DELETE to confirm).
A screen recording of the full flow is attached in App Review Information → Notes.

Please let us know if you need anything else.
```

## Manual smoke checklist

- [ ] Continue with Apple on iPhone cold launch
- [ ] Continue with Apple on iPad
- [ ] Continue with Google still works
- [ ] Email/password sign-up + sign-in
- [ ] Settings → Account → Delete account end-to-end (test account)
- [ ] After delete, cannot sign in with same credentials; new account can reuse email if provider allows
