import {
  createError,
  defineEventHandler,
  getHeader,
  readBody,
  readRawBody,
  type H3Event,
} from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getLightningEnv } from '../../../utils/lightningEnv'
import { getSupabaseServiceClient } from '../../../utils/supabaseService'
import { grantCreditsIdempotent } from '../../../utils/creditsPayment'
import { fetchBtcpayInvoice } from '../../../utils/lightningBtcpay'
import {
  parseDigifiOrderId,
  verifyOpennodeWebhookSignature,
} from '../../../utils/lightningOpennode'

interface BtcpayWebhookPayload {
  type?: string
  invoiceId?: string
  metadata?: {
    userId?: string
    numberOfCredits?: string
    purpose?: string
  }
}

function verifyBtcpaySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

function parseOpennodeWebhookBody(
  body: Record<string, unknown> | string | null
): Record<string, string> {
  if (!body) return {}
  if (typeof body === 'string') {
    return Object.fromEntries(new URLSearchParams(body))
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && value !== null) {
      out[key] = String(value)
    }
  }
  return out
}

async function handleBtcpayWebhook(event: H3Event) {
  const { webhookSecret } = getLightningEnv()
  if (!webhookSecret) {
    throw createError({ statusCode: 503, statusMessage: 'BTCPay webhook is not configured' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Credits service is not configured' })
  }

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing webhook body' })
  }

  const bodyText = rawBody.toString('utf8')
  const signature = getHeader(event, 'btcpay-sig') ?? ''
  if (!verifyBtcpaySignature(bodyText, signature.replace(/^sha256=/, ''), webhookSecret)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid BTCPay webhook signature' })
  }

  let payload: BtcpayWebhookPayload
  try {
    payload = JSON.parse(bodyText) as BtcpayWebhookPayload
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook JSON' })
  }

  const settledTypes = new Set(['InvoiceSettled', 'InvoicePaymentSettled'])
  if (!payload.type || !settledTypes.has(payload.type)) {
    return { received: true, ignored: true }
  }

  const invoiceId = payload.invoiceId
  if (!invoiceId) {
    return { received: true, ignored: true }
  }

  const invoice = await fetchBtcpayInvoice(invoiceId)
  const metadata = payload.metadata ?? invoice.metadata ?? {}
  const userId = metadata.userId
  const numberOfCredits = Number.parseInt(metadata.numberOfCredits ?? '', 10)
  const purpose = metadata.purpose

  if (
    purpose === 'digifi_credits' &&
    userId &&
    Number.isInteger(numberOfCredits) &&
    numberOfCredits > 0
  ) {
    await grantCreditsIdempotent(service, userId, numberOfCredits, {
      referenceId: `btcpay:${invoiceId}`,
      paymentMethod: 'lightning',
      description: `Purchased ${numberOfCredits} credits (Lightning)`,
    })
  }

  return { received: true }
}

async function handleOpennodeWebhook(event: H3Event) {
  const { opennodeApiKey } = getLightningEnv()
  if (!opennodeApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'OpenNode is not configured' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Credits service is not configured' })
  }

  const rawBody = await readRawBody(event)
  const parsed = parseOpennodeWebhookBody(
    rawBody ? rawBody.toString('utf8') : await readBody(event)
  )

  const chargeId = parsed.id
  const status = parsed.status
  const orderId = parsed.order_id
  const hashedOrder = parsed.hashed_order

  if (!chargeId || !hashedOrder) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OpenNode webhook payload' })
  }

  if (!verifyOpennodeWebhookSignature(chargeId, hashedOrder, opennodeApiKey)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OpenNode webhook signature' })
  }

  if (status !== 'paid' || !orderId) {
    return { received: true, ignored: true }
  }

  const order = parseDigifiOrderId(orderId)
  if (!order) {
    return { received: true, ignored: true }
  }

  await grantCreditsIdempotent(service, order.userId, order.numberOfCredits, {
    referenceId: `opennode:${chargeId}`,
    paymentMethod: 'lightning',
    description: `Purchased ${order.numberOfCredits} credits (Lightning)`,
  })

  return { received: true }
}

export default defineEventHandler(async (event) => {
  const { provider } = getLightningEnv()

  if (provider === 'opennode') {
    return handleOpennodeWebhook(event)
  }

  if (provider === 'btcpay') {
    return handleBtcpayWebhook(event)
  }

  throw createError({ statusCode: 503, statusMessage: 'Lightning webhook is not configured' })
})
