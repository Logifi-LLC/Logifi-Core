import { createError, defineEventHandler, getHeader, readRawBody } from 'h3'
import { getStripeClient } from '../../../utils/stripeClient'
import { getStripeEnv } from '../../../utils/stripeEnv'
import { getSupabaseServiceClient } from '../../../utils/supabaseService'
import { grantCreditsIdempotent } from '../../../utils/creditsPayment'

export default defineEventHandler(async (event) => {
  const stripe = getStripeClient()
  const { webhookSecret } = getStripeEnv()
  if (!stripe || !webhookSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe webhook is not configured' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Credits service is not configured' })
  }

  const signature = getHeader(event, 'stripe-signature')
  if (!signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing Stripe signature' })
  }

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing webhook body' })
  }

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: unknown) {
    console.error('[stripe] webhook signature verification failed:', err)
    throw createError({ statusCode: 400, statusMessage: 'Invalid Stripe signature' })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const userId = session.metadata?.userId
    const numberOfCredits = Number.parseInt(session.metadata?.numberOfCredits ?? '', 10)
    const purpose = session.metadata?.purpose

    if (purpose === 'digifi_credits' && userId && Number.isInteger(numberOfCredits) && numberOfCredits > 0) {
      await grantCreditsIdempotent(service, userId, numberOfCredits, {
        referenceId: `stripe:${session.id}`,
        paymentMethod: 'stripe',
        description: `Purchased ${numberOfCredits} credits (Stripe)`,
      })
    }
  }

  return { received: true }
})
