# Sign in with Apple — portal setup (Guideline 4.8)

Manual steps required before TestFlight / App Store builds can complete Apple login. Bundle ID: **`io.logifi.app`**.

## 1. Apple Developer — App ID

1. Open [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Select App ID **`io.logifi.app`**
3. Enable capability **Sign In with Apple** → Save

## 2. Apple Developer — Services ID (web / OAuth)

Needed for Sign in with Apple on the website (and any non-native OAuth path).

1. Identifiers → **+** → **Services IDs**
2. Description: `Logifi Web`, Identifier e.g. **`io.logifi.app.web`**
3. Enable **Sign In with Apple** → Configure:
   - Primary App ID: `io.logifi.app`
   - Domains: your production host (e.g. `www.logifi.io`) **and** your Supabase project host (`<project-ref>.supabase.co`)
   - Return URLs: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Save

## 3. Apple Developer — Key

1. [Keys](https://developer.apple.com/account/resources/authkeys/list) → **+**
2. Name: `Logifi Sign in with Apple`
3. Enable **Sign In with Apple** → Configure → select App ID `io.logifi.app`
4. Download the `.p8` once; note **Key ID** and your **Team ID**

## 4. Supabase — Apple provider

1. Dashboard → **Authentication → Providers → Apple** → Enable
2. **Client IDs** (comma-separated, **order matters**):
   - First: Services ID (e.g. `io.logifi.app.web`) — used for web `signInWithOAuth`
   - Second: App ID `io.logifi.app` — used for native `signInWithIdToken`
3. **Secret**: generate the Apple client-secret JWT (ES256) from the `.p8` using Team ID, Key ID, and Services ID as `sub` / `client_id`. Supabase docs: [Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple). Paste into Secret Key. Rotate before expiry (~6 months).
4. Save

## 5. Supabase — Redirect URLs

Under **Authentication → URL Configuration**, keep (as used for Google already):

- `https://localhost/auth/callback` (Capacitor WebView)
- `io.logifi.app://auth/callback` (custom scheme, if listed)
- Production web origins: `https://www.logifi.io/auth/callback` (and any staging hosts)

## 6. Xcode

After pulling code that adds `App.entitlements`:

1. Open `ios/App/App.xcworkspace` (or `.xcodeproj`)
2. Target **App** → **Signing & Capabilities**
3. Confirm **Sign in with Apple** appears (entitlement `com.apple.developer.applesignin`)
4. Team **6VTFG8AC7Y** — Automatic signing

Then:

```bash
npm run cap:sync
```

## 7. Verify

| Surface | Expected |
|---------|----------|
| iPhone / iPad (Capacitor) | System Apple sheet → lands signed in (no Safari OAuth required) |
| Web | Continue with Apple → Apple / Supabase OAuth → `/auth/callback` |

If native works but web fails (or the reverse), re-check Client ID **order** in Supabase (Services ID must be first).
