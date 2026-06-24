import { createHmac, timingSafeEqual } from 'node:crypto'
import { getLightningEnv } from './lightningEnv'
import { totalDollarsFromCents } from './creditsPricing'
import type { LightningInvoiceResult } from './lightningBtcpay'

const OPENNODE_API_BASE = 'https://api.opennode.com'

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

export async function createOpennodeCreditsCharge(input: {
  userId: string
  numberOfCredits: number
  totalCents: number
  requestOrigin: string
}): Promise<LightningInvoiceResult> {
  const env = getLightningEnv()
  if (!env.opennodeApiKey) {
    throw new Error('Lightning (OpenNode) is not configured on this server')
  }

  const callbackBase = (env.opennodeCallbackOrigin || input.requestOrigin).replace(/\/$/, '')
  const amountDollars = totalDollarsFromCents(input.totalCents)

  const response = await fetch(`${OPENNODE_API_BASE}/v1/charges`, {
    method: 'POST',
    headers: opennodeHeaders(env.opennodeApiKey),
    body: JSON.stringify({
      amount: amountDollars,
      currency: 'USD',
      description: `Digifi credits (${input.numberOfCredits})`,
      order_id: encodeDigifiOrderId(input.userId, input.numberOfCredits),
      callback_url: `${callbackBase}/api/credits/webhook/lightning`,
      success_url: `${input.requestOrigin.replace(/\/$/, '')}/logbook-builder?digifi=open&credits=success`,
      auto_settle: false,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[lightning] OpenNode charge create failed:', response.status, text)
    throw new Error('Could not create Lightning charge')
  }

  const payload = (await response.json()) as OpennodeChargeResponse
  const data = payload.data
  if (!data?.id) {
    throw new Error('OpenNode charge response missing id')
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
    throw new Error('Lightning (OpenNode) is not configured on this server')
  }

  const response = await fetch(
    `${OPENNODE_API_BASE}/v1/charge/${encodeURIComponent(chargeId)}`,
    { headers: opennodeHeaders(env.opennodeApiKey) }
  )

  if (!response.ok) {
    throw new Error('Could not fetch OpenNode charge status')
  }

  const payload = (await response.json()) as OpennodeChargeResponse
  const status = payload.data?.status ?? 'unknown'
  return { status, paid: status === 'paid' }
}
