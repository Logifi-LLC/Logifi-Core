/**
 * Stripe API key resolution.
 *
 * Prefer live `process.env` (Vercel injects secrets when the serverless function runs).
 * Fall back to `runtimeConfig` (often filled from env at build time).
 * Also accept `NUXT_STRIPE_*` — Nuxt's documented override shape for `runtimeConfig.stripe*`.
 */
export function getStripeEnv() {
  const config = useRuntimeConfig()
  const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const pick = (...candidates: unknown[]) => {
    for (const c of candidates) {
      const s = clean(c)
      if (s) return s
    }
    return ''
  }

  return {
    secretKey: pick(
      process.env.STRIPE_SECRET_KEY,
      process.env.NUXT_STRIPE_SECRET_KEY,
      config.stripeSecretKey
    ),
    webhookSecret: pick(
      process.env.STRIPE_WEBHOOK_SECRET,
      process.env.NUXT_STRIPE_WEBHOOK_SECRET,
      config.stripeWebhookSecret
    ),
    publishableKey: pick(
      process.env.STRIPE_PUBLISHABLE_KEY,
      process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      config.public.stripePublishableKey
    ),
  }
}
