import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import {
  type PaymentMethod,
  calculatePurchaseTotal,
  totalDollarsFromCents,
  validatePurchase,
} from '../../utils/creditsPricing'
import { processMockPayment } from '../../utils/creditsMockPayment'
import { addCredits } from '../../utils/creditsBalance'
import { isMockCreditsEnabled } from '../../utils/creditsMockEnabled'

const PAYMENT_METHODS = new Set<PaymentMethod>(['stripe', 'lightning'])

function parsePaymentMethod(value: unknown): PaymentMethod | null {
  if (typeof value !== 'string') return null
  const normalized = value.toLowerCase() as PaymentMethod
  return PAYMENT_METHODS.has(normalized) ? normalized : null
}

/**
 * Mock purchase endpoint for Digifi page credits (Stripe / Lightning placeholders).
 * Identity comes from the Bearer token only — never from the request body.
 */
export default defineEventHandler(async (event) => {
  if (!isMockCreditsEnabled()) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Mock credit purchases are disabled on this server',
    })
  }

  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Credits service is not configured on this server',
    })
  }

  const body = await readBody(event)
  const numberOfCredits =
    typeof body?.numberOfCredits === 'number'
      ? body.numberOfCredits
      : Number.parseInt(String(body?.numberOfCredits ?? ''), 10)
  const paymentMethod = parsePaymentMethod(body?.paymentMethod)

  if (!paymentMethod) {
    throw createError({
      statusCode: 400,
      statusMessage: 'paymentMethod must be "stripe" or "lightning"',
    })
  }

  const validation = validatePurchase(paymentMethod, numberOfCredits)
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.error })
  }

  const pricing = calculatePurchaseTotal(paymentMethod, numberOfCredits)
  if (!pricing.valid) {
    throw createError({ statusCode: 400, statusMessage: pricing.error ?? 'Invalid purchase' })
  }

  await processMockPayment({ paymentMethod, numberOfCredits })

  const credits = await addCredits(service, userId, numberOfCredits, {
    description: `Purchased ${numberOfCredits} credits`,
    paymentMethod,
    referenceId: `mock-${paymentMethod}-${Date.now()}`,
  })

  return {
    credits,
    numberOfCredits,
    paymentMethod,
    totalCents: pricing.totalCents,
    totalDollars: totalDollarsFromCents(pricing.totalCents),
    rateCentsPerPage: pricing.rateCentsPerPage,
  }
})
