/**
 * Lightning payment provider configuration.
 * Default provider: OpenNode. BTCPay remains available via LIGHTNING_PROVIDER=btcpay.
 */
export type LightningProviderId = 'opennode' | 'btcpay' | 'none'

export function getLightningEnv() {
  const config = useRuntimeConfig()
  const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const pick = (...candidates: unknown[]) => {
    for (const c of candidates) {
      const s = clean(c)
      if (s) return s
    }
    return ''
  }

  const providerRaw = pick(
    process.env.LIGHTNING_PROVIDER,
    process.env.NUXT_LIGHTNING_PROVIDER,
    config.lightningProvider
  ).toLowerCase()

  let provider: LightningProviderId = 'opennode'
  if (providerRaw === 'btcpay') provider = 'btcpay'
  else if (providerRaw === 'none') provider = 'none'
  else if (providerRaw === 'opennode') provider = 'opennode'

  const opennodeApiBase = pick(
    process.env.OPENNODE_API_BASE,
    process.env.NUXT_OPENNODE_API_BASE,
    config.opennodeApiBase,
    'https://api.opennode.com'
  ).replace(/\/$/, '')

  return {
    provider,
    opennodeApiKey: pick(
      process.env.OPENNODE_API_KEY,
      process.env.NUXT_OPENNODE_API_KEY,
      config.opennodeApiKey
    ),
    opennodeApiBase,
    opennodeCallbackOrigin: pick(
      process.env.OPENNODE_CALLBACK_ORIGIN,
      process.env.NUXT_OPENNODE_CALLBACK_ORIGIN,
      config.opennodeCallbackOrigin
    ).replace(/\/$/, ''),
    btcpayHost: pick(
      process.env.BTCPAY_HOST,
      process.env.NUXT_BTCPAY_HOST,
      config.btcpayHost
    ).replace(/\/$/, ''),
    btcpayApiKey: pick(
      process.env.BTCPAY_API_KEY,
      process.env.NUXT_BTCPAY_API_KEY,
      config.btcpayApiKey
    ),
    btcpayStoreId: pick(
      process.env.BTCPAY_STORE_ID,
      process.env.NUXT_BTCPAY_STORE_ID,
      config.btcpayStoreId
    ),
    webhookSecret: pick(
      process.env.BTCPAY_WEBHOOK_SECRET,
      process.env.NUXT_BTCPAY_WEBHOOK_SECRET,
      config.btcpayWebhookSecret
    ),
  }
}

export function isLightningConfigured(): boolean {
  const env = getLightningEnv()
  if (env.provider === 'none') return false
  if (env.provider === 'opennode') {
    return Boolean(env.opennodeApiKey)
  }
  return Boolean(env.btcpayHost && env.btcpayApiKey && env.btcpayStoreId)
}
