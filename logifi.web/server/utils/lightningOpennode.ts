import { createHmac, timingSafeEqual } from 'node:crypto'
import { createError } from 'h3'
import { getLightningEnv } from './lightningEnv'
import { totalDollarsFromCents } from './creditsPricing'
import type { LightningInvoiceResult } from './lightningBtcpay'

export const DIGIFI_ORDER_PREFIX = 'digifi_credits'

export interface DigifiOrderIdPayload {
  purpose: typeof DIGIFI_ORDER_PREFIX
  userId: string
  numberOfCredits: number
}

interface OpennodeChargeData {
  id: string
  status?: string
  hosted_checkout_url?: string
  order_id?: string
  lightning_invoice?: {
    payreq?: string
  }
}

interface OpennodeChargeResponse {
  data?: OpennodeChargeData
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

const TUNNEL_HOST_SUFFIXES = ['.ngrok-free.app', '.ngrok.io', '.trycloudflare.com']

function isTunnelHostname(hostname: string): boolean {
  return TUNNEL_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix)
  )
}

/** OpenNode requires a public HTTPS success_url; bounce back to the browser origin after payment. */
export function buildLightningCheckoutSuccessUrl(input: {
  publicOrigin: string
  requestOrigin: string
}): string {
  const destination = `${input.requestOrigin.replace(/\/$/, '')}/logbook-builder?digifi=open&credits=success`
  const returnBase = `${input.publicOrigin.replace(/\/$/, '')}/api/credits/checkout/lightning/return`
  // OpenNode rejects success_url values containing "localhost" (even URL-encoded). Use base64url token.
  const token = Buffer.from(destination, 'utf8').toString('base64url')
  return `${returnBase}?r=${token}`
}

export function decodeLightningReturnToken(token: string | undefined): string | null {
  if (!token) return null
  try {
    return Buffer.from(token, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

export function resolveLightningReturnDestination(input: string | undefined): string | null {
  const decoded = decodeLightningReturnToken(input)
  if (!decoded) return null
  try {
    const parsed = new URL(decoded)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    if (!parsed.pathname.startsWith('/logbook-builder')) return null

    const host = parsed.hostname
    if (LOCAL_HOSTNAMES.has(host)) {
      return parsed.toString()
    }
    if (isTunnelHostname(host)) {
      return null
    }
    if (parsed.protocol !== 'https:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

export function encodeDigifiOrderId(userId: string, numberOfCredits: number): string {
  return `${DIGIFI_ORDER_PREFIX}|${userId}|${numberOfCredits}`
}

export function parseDigifiOrderId(orderId: string): DigifiOrderIdPayload | null {
  const parts = orderId.split('|')
  if (parts.length !== 3 || parts[0] !== DIGIFI_ORDER_PREFIX) {
    return null
  }
  const userId = parts[1]?.trim()
  const numberOfCredits = Number.parseInt(parts[2] ?? '', 10)
  if (!userId || !Number.isInteger(numberOfCredits) || numberOfCredits < 1) {
    return null
  }
  return { purpose: DIGIFI_ORDER_PREFIX, userId, numberOfCredits }
}

export function verifyOpennodeWebhookSignature(
  chargeId: string,
  hashedOrder: string,
  apiKey: string
): boolean {
  if (!chargeId || !hashedOrder || !apiKey) return false
  const calculated = createHmac('sha256', apiKey).update(chargeId).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hashedOrder, 'hex'))
  } catch {
    return calculated === hashedOrder
  }
}

function opennodeHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname)
  } catch {
    return false
  }
}

/** OpenNode rejects localhost callback/success URLs. Require a public HTTPS origin for local dev. */
export function resolveOpennodePublicOrigin(input: {
  opennodeCallbackOrigin: string
  requestOrigin: string
}): string {
  const origin = (input.opennodeCallbackOrigin || input.requestOrigin).replace(/\/$/, '')
  if (isLocalOrigin(origin)) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'Lightning checkout needs a public HTTPS origin. Run ngrok http https://localhost:3000 and set OPENNODE_CALLBACK_ORIGIN to the ngrok URL, then restart the dev server.',
    })
  }
  return origin
}

function opennodeProviderError(status: number): never {
  if (status === 401 || status === 403) {
    throw createError({
      statusCode: 502,
      statusMessage: `OpenNode rejected the charge (${status}). Check API key permissions, account status, and that callback/success URLs use a public HTTPS origin.`,
    })
  }
  throw createError({
    statusCode: 502,
    statusMessage: 'Could not create Lightning charge. Try again or contact support.',
  })
}

export async function createOpennodeCreditsCharge(input: {
  userId: string
  numberOfCredits: number
  totalCents: number
  requestOrigin: string
}): Promise<LightningInvoiceResult> {
  const env = getLightningEnv()
  if (!env.opennodeApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Lightning (OpenNode) is not configured on this server',
    })
  }

  const publicOrigin = resolveOpennodePublicOrigin({
    opennodeCallbackOrigin: env.opennodeCallbackOrigin,
    requestOrigin: input.requestOrigin,
  })
  const amountDollars = totalDollarsFromCents(input.totalCents)

  const response = await fetch(`${env.opennodeApiBase}/v1/charges`, {
    method: 'POST',
    headers: opennodeHeaders(env.opennodeApiKey),
    body: JSON.stringify({
      amount: amountDollars,
      currency: 'USD',
      description: `Digifi credits (${input.numberOfCredits})`,
      order_id: encodeDigifiOrderId(input.userId, input.numberOfCredits),
      callback_url: `${publicOrigin}/api/credits/webhook/lightning`,
      success_url: buildLightningCheckoutSuccessUrl({
        publicOrigin,
        requestOrigin: input.requestOrigin,
      }),
      auto_settle: false,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[lightning] OpenNode charge create failed:', response.status, text)
    opennodeProviderError(response.status)
  }

  const payload = (await response.json()) as OpennodeChargeResponse
  const data = payload.data
  if (!data?.id) {
    throw createError({
      statusCode: 502,
      statusMessage: 'OpenNode charge response missing id',
    })
  }

  return {
    invoiceId: data.id,
    checkoutLink: data.hosted_checkout_url ?? null,
    bolt11: data.lightning_invoice?.payreq ?? null,
    amountCents: input.totalCents,
  }
}

export async function fetchOpennodeChargeStatus(
  chargeId: string
): Promise<{ status: string; paid: boolean }> {
  const env = getLightningEnv()
  if (!env.opennodeApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Lightning (OpenNode) is not configured on this server',
    })
  }

  const response = await fetch(
    `${env.opennodeApiBase}/v1/charge/${encodeURIComponent(chargeId)}`,
    { headers: opennodeHeaders(env.opennodeApiKey) }
  )

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not fetch OpenNode charge status',
    })
  }

  const payload = (await response.json()) as OpennodeChargeResponse
  const status = payload.data?.status ?? 'unknown'
  return { status, paid: status === 'paid' }
}
