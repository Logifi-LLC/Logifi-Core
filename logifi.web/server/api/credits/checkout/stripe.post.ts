import { createError, defineEventHandler, readBody } from 'h3'
import { getRequestURL } from 'h3'
import { getUserIdFromEvent } from '../../../utils/supabase'
import { getStripeClient } from '../../../utils/stripeClient'
import { getStripeEnv } from '../../../utils/stripeEnv'
import {
  type PaymentMethod,
  calculatePurchaseTotal,
  validatePurchase,
} from '../../../utils/creditsPricing'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const stripe = getStripeClient()
  const { publishableKey } = getStripeEnv()
  if (!stripe || !publishableKey) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe is not configured on this server' })
  }

  const body = await readBody(event)
  const numberOfCredits =
    typeof body?.numberOfCredits === 'number'
      ? body.numberOfCredits
      : Number.parseInt(String(body?.numberOfCredits ?? ''), 10)

  const validation = validatePurchase('stripe' as PaymentMethod, numberOfCredits)
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.error })
  }

  const pricing = calculatePurchaseTotal('stripe', numberOfCredits)
  if (!pricing.valid) {
    throw createError({ statusCode: 400, statusMessage: pricing.error ?? 'Invalid purchase' })
  }

  const origin = getRequestURL(event).origin
  const successUrl = `${origin}/logbook-builder?digifi=open&credits=success`
  const cancelUrl = `${origin}/logbook-builder?digifi=open&credits=cancelled`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: numberOfCredits,
        price_data: {
          currency: 'usd',
          unit_amount: pricing.rateCentsPerPage,
          product_data: {
            name: 'Digifi credits',
            description: `${numberOfCredits} spread scan credit${numberOfCredits === 1 ? '' : 's'}`,
          },
        },
      },
    ],
    metadata: {
      userId,
      numberOfCredits: String(numberOfCredits),
      purpose: 'digifi_credits',
    },
  })

  if (!session.url) {
    throw createError({ statusCode: 500, statusMessage: 'Could not create Stripe checkout session' })
  }

  return {
    ok: true as const,
    checkoutUrl: session.url,
    sessionId: session.id,
  }
})
