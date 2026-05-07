/**
 * FC View OAuth/API URL resolution.
 *
 * Prefer live `process.env` (Vercel injects secrets when the serverless function runs).
 * Fall back to `runtimeConfig` (often filled from env at **build** time).
 * Also accept `NUXT_FCV_*` — Nuxt’s documented override shape for `runtimeConfig.fcv*`.
 */
export function getFcvIntegrationEnv() {
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
    clientId: pick(
      process.env.FCV_CLIENT_ID,
      process.env.NUXT_FCV_CLIENT_ID,
      config.fcvClientId
    ),
    clientSecret: pick(
      process.env.FCV_CLIENT_SECRET,
      process.env.NUXT_FCV_CLIENT_SECRET,
      config.fcvClientSecret
    ),
    redirectUri: pick(
      process.env.FCV_REDIRECT_URI,
      process.env.NUXT_FCV_REDIRECT_URI,
      config.fcvRedirectUri
    ),
    authorizeUrl: pick(
      process.env.FCV_AUTHORIZE_URL,
      process.env.NUXT_FCV_AUTHORIZE_URL,
      config.fcvAuthorizeUrl
    ),
    tokenUrl: pick(process.env.FCV_TOKEN_URL, process.env.NUXT_FCV_TOKEN_URL, config.fcvTokenUrl),
    apiBaseUrl: pick(
      process.env.FCV_API_BASE_URL,
      process.env.NUXT_FCV_API_BASE_URL,
      config.fcvApiBaseUrl
    ),
  }
}
