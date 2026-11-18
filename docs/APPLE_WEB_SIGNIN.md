# Sign in with Apple on the web

Web Apple is gated by `NUXT_PUBLIC_APPLE_WEB_SIGNIN`. Leave it unset until every step below is done. Native iOS Sign in with Apple (`signInWithIdToken`) does not use this flag.

Bundle ID: **`io.logifi.app`**. Team ID: **`6VTFG8AC7Y`**. Suggested Services ID: **`io.logifi.app.web`**.

Supabase project host: **`rbxzderapvtdvtumsnvd.supabase.co`**.

## 1. Apple Developer — App ID

1. Open [Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list).
2. Click the App ID **`io.logifi.app`**.
3. Under Capabilities, enable **Sign In with Apple**.
4. Click **Save** → **Confirm**.

## 2. Apple Developer — Services ID

1. Same Identifiers page → **+** (top left).
2. Select **Services IDs** → **Continue**.
3. Description: `Logifi Web`. Identifier: `io.logifi.app.web`.
4. **Continue** → **Register**.
5. Click the new Services ID.
6. Check **Sign In with Apple** → **Configure**.
7. Primary App ID: **`io.logifi.app`**.
8. **Domains and Subdomains** (no `https://`, no path):
   - `www.logifi.io`
   - `logifi.io`
   - `rbxzderapvtdvtumsnvd.supabase.co`
9. **Return URLs** (exact):
   - `https://rbxzderapvtdvtumsnvd.supabase.co/auth/v1/callback`
10. **Next** → **Done** → **Continue** → **Save**.

## 3. Apple Developer — Key

1. Open [Keys](https://developer.apple.com/account/resources/authkeys/list) → **+**.
2. Key Name: `Logifi Sign in with Apple`.
3. Check **Sign In with Apple** → **Configure** → select App ID `io.logifi.app` → **Save**.
4. **Continue** → **Register**.
5. Download the `.p8` **once**. Note **Key ID**. Store the file privately; do not commit it.

If a Sign in with Apple key already exists for this App ID, reuse it. Apple allows only one of these keys at a time.

## 4. Supabase — Apple provider

1. Open the Logifi project → **Authentication** → **Sign In / Providers** → **Apple**.
2. Enable the provider.
3. **Client IDs** (comma-separated, **Services ID first**):

   ```
   io.logifi.app.web,io.logifi.app
   ```

   Both values are required: the Services ID for web `signInWithOAuth`, the iOS bundle ID for native `signInWithIdToken`. If the bundle ID is listed first, native login still works and **web Apple is rejected by Apple**.

4. **Secret Key**: generate an Apple client-secret JWT (ES256) from the `.p8`, using Team ID `6VTFG8AC7Y`, the Key ID, and Services ID `io.logifi.app.web` as `sub` / `client_id`. Follow [Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple) (secret generator on that page). Paste the JWT. Rotate before it expires (~6 months).
5. Save.

Do not paste the `.p8` or the JWT into git, chat, or this repo.

## 5. Supabase — Redirect URLs

**Authentication** → **URL Configuration** → Redirect URLs. Keep the Google list and confirm:

- `https://www.logifi.io/auth/callback`
- `https://logifi.io/auth/callback`
- `http://localhost:3000/auth/callback` (local web)
- `io.logifi.app://auth/callback` (native)

The Apple **Return URL** is the Supabase callback in step 2, not these app URLs.

## 6. Supabase — Manual linking

**Authentication** → **Providers** (or Auth settings) → enable **Manual linking**.

Required so a signed-in user can connect Apple or Google from Account → Sign-in methods. Do not skip this. This PR does not change Supabase config.

## 7. Show the web button

Set on Vercel (Preview + Production as needed) and any local `.env`:

```
NUXT_PUBLIC_APPLE_WEB_SIGNIN=true
```

Redeploy `logifi.web`. Until this is set, Continue with Apple stays iOS-only.

## 8. Smoke

| Surface | Expected |
| --- | --- |
| iOS app | Unchanged native Apple sheet → signed in |
| Web, flag off | No Apple button |
| Web, flag on | Continue with Apple → Apple → `/auth/callback` → dashboard |
| Account → Sign-in methods | Connect Apple (web, flag on) and Connect Google; Unlink disabled on the last method |

If native works and web fails, Client IDs order is wrong (Services ID must be first).
