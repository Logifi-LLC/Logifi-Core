import { createError, defineEventHandler, readBody } from 'h3'
import { getUserIdFromEvent } from '../../../utils/supabase'
import { getSupabaseServiceClient } from '../../../utils/supabaseService'
import { grantCreditsIdempotent } from '../../../utils/creditsPayment'
import { rewardReferrerForPaidPurchase } from '../../../utils/referrals'
import { verifyTransaction, isAppleIapConfigured } from '../../../utils/appleIapVerification'
import { getIapProduct } from '../../../../app/utils/iapProducts'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!(await isAppleIapConfigured())) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Apple IAP verification is not configured on this server',
    })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Credits service is not configured' })
  }

  const body = await readBody(event)
  const { productId, transactionId, jwsRepresentation } = body

  if (!productId || typeof productId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'productId is required' })
  }

  if (!transactionId || typeof transactionId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'transactionId is required' })
  }

  if (!jwsRepresentation || typeof jwsRepresentation !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'jwsRepresentation is required for StoreKit 2 verification',
    })
  }

  // Verify the product exists in our catalog
  const product = getIapProduct(productId)
  if (!product) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown product' })
  }

  // Verify the transaction with Apple
  let verifiedPayload
  try {
    verifiedPayload = await verifyTransaction(jwsRepresentation)
  } catch (err: unknown) {
    console.error('[iap] Apple transaction verification failed:', err)
    throw createError({
      statusCode: 400,
      statusMessage: 'Transaction verification failed',
    })
  }

  const payloadAppAccountToken =
    typeof verifiedPayload.appAccountToken === 'string'
      ? verifiedPayload.appAccountToken.toLowerCase()
      : null
  if (payloadAppAccountToken && payloadAppAccountToken !== userId.toLowerCase()) {
    console.error('[iap] appAccountToken does not match signed-in user', {
      userId,
      appAccountToken: verifiedPayload.appAccountToken,
      transactionId: verifiedPayload.transactionId,
    })
    throw createError({
      statusCode: 403,
      statusMessage: 'Purchase is not linked to this account',
    })
  }

  // Ensure the verified product matches what the client claimed
  if (verifiedPayload.productId !== productId) {
    console.error('[iap] product ID mismatch', {
      claimed: productId,
      verified: verifiedPayload.productId,
      transactionId: verifiedPayload.transactionId,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Transaction verification failed',
    })
  }

  // Ensure the verified transaction ID matches
  if (verifiedPayload.transactionId !== transactionId) {
    console.error('[iap] transaction ID mismatch', {
      claimed: transactionId,
      verified: verifiedPayload.transactionId,
    })
    throw createError({
      statusCode: 400,
      statusMessage: 'Transaction verification failed',
    })
  }

  // Grant credits idempotently using the transaction ID as reference
  const result = await grantCreditsIdempotent(service, userId, product.credits, {
    referenceId: `apple:${transactionId}`,
    paymentMethod: 'apple_iap',
    description: `Purchased ${product.credits} credits (Apple IAP)`,
  })

  if (result.granted) {
    try {
      await rewardReferrerForPaidPurchase(service, userId, 'apple_iap')
    } catch (err) {
      console.error('[referrals] referrer reward failed:', err)
    }
  }

  const outcome = result.granted ? 'credited' : 'already_granted'

  return {
    ok: true,
    credits: result.credits,
    granted: result.granted,
    outcome,
  }
})
