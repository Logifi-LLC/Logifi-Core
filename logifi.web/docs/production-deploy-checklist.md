# Production deploy checklist (dev → main)

Use after merging `dev` into `main`. Vercel deploys from `main` with root directory `logifi.web`.

## 1. Supabase migrations (production project)

Run **once** on the **production** Supabase project (Dashboard → SQL Editor), in order:

Bundled file: [`supabase/production-migrations-044-054.sql`](../supabase/production-migrations-044-054.sql)

Or run individual files in `supabase/migrations/` from `000044` through `000054`.

**Verify after migrate:**

```sql
SELECT id FROM storage.buckets WHERE id = 'digifi-capture';
SELECT COUNT(*) FROM credit_transactions;
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'user_profiles' AND column_name = 'credits';
```

## 2. Vercel production environment variables

Project → Settings → Environment Variables → **Production** (redeploy after saving).

### Required — Supabase + Digifi

| Variable | Value |
|----------|-------|
| `NUXT_PUBLIC_SUPABASE_URL` | Production project URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key |
| `GEMINI_API_KEY` | Production Gemini key |
| `NUXT_PUBLIC_COMPANION_CAPTURE_ORIGIN` | `https://YOUR_PRODUCTION_DOMAIN` |

### Required — live payments

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook (step 3) |
| `OPENNODE_API_KEY` | Production OpenNode key (Invoices) |
| `OPENNODE_API_BASE` | `https://api.opennode.com` |
| `OPENNODE_CALLBACK_ORIGIN` | `https://YOUR_PRODUCTION_DOMAIN` |
| `NUXT_PUBLIC_LIGHTNING_PAYMENTS_ENABLED` | `true` |
| `NUXT_CREDITS_MOCK_ENABLED` | `false` |

### Optional

- FCV vars if FC View is enabled
- `ANTHROPIC_API_KEY` if using Claude for Digifi
- Digifi tuning: `NUXT_DIGIFI_MODEL`, `NUXT_DIGIFI_MODEL_FALLBACKS`, etc.

See also [`env.example`](../env.example) and [`digifi-beta-env-checklist.md`](./digifi-beta-env-checklist.md).

## 3. Payment webhooks

Replace `YOUR_PRODUCTION_DOMAIN` with your live URL (e.g. `app.logifi.io` or `*.vercel.app`).

### Stripe (live)

1. [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → Add endpoint
2. URL: `https://YOUR_PRODUCTION_DOMAIN/api/credits/webhook/stripe`
3. Event: `checkout.session.completed`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` in Vercel → redeploy

### OpenNode (live)

1. OpenNode dashboard → callback URL: `https://YOUR_PRODUCTION_DOMAIN/api/credits/webhook/lightning`
2. `OPENNODE_CALLBACK_ORIGIN=https://YOUR_PRODUCTION_DOMAIN` in Vercel → redeploy

## 4. Deploy

Push `main` — Vercel auto-deploys. Or: `cd logifi.web && npx vercel --prod`.

## 5. Smoke test (production)

- [ ] Sign in / sign up (new user gets 10 welcome credits)
- [ ] Add Pages → Digifi scan (1 credit per spread)
- [ ] Connect phone → QR opens on phone
- [ ] Stripe checkout → credits appear
- [ ] Lightning invoice → credits appear
- [ ] Mock credits disabled (`/api/credits/add-mock` returns 403)
- [ ] Dashboard import / simulator logbook still works
- [ ] Vercel function logs: no Stripe/OpenNode webhook errors
