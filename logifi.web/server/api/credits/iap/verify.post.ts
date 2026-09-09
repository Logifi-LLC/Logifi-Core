import { createError, defineEventHandler, readBody } from 'h3'
import { getUserIdFromEvent } from '../../../utils/supabase'
import { getSupabaseServiceClient } from '../../../utils/supabaseService'
import { grantCreditsIdempotent } from '../../../utils/creditsPayment'
import { verifyTransaction, isAppleIapConfigured } from '../../../utils/appleIapVerification'
import { getIapProduct } from '../../../../app/utils/iapProducts'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!isAppleIapConfigured()) {
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
    throw createError({ statusCode: 400, statusMessage: `Unknown product: ${productId}` })
  }

  // Verify the transaction with Apple
  let verifiedPayload
  try {
    verifiedPayload = await verifyTransaction(jwsRepresentation)
  } catch (err: unknown) {
    console.error('[iap] Apple transaction verification failed:', err)
    throw createError({
      statusCode: 400,
      statusMessage: err instanceof Error ? err.message : 'Apple receipt verification failed',
    })
  }

  // Ensure the verified product matches what the client claimed
  if (verifiedPayload.productId !== productId) {
    throw createError({
      statusCode: 400,
      statusMessage: `Product ID mismatch: expected ${productId}, got ${verifiedPayload.productId}`,
    })
  }

  // Ensure the verified transaction ID matches
  if (verifiedPayload.transactionId !== transactionId) {
    throw createError({
      statusCode: 400,
      statusMessage: `Transaction ID mismatch: expected ${transactionId}, got ${verifiedPayload.transactionId}`,
    })
  }

  // Grant credits idempotently using the transaction ID as reference
  const result = await grantCreditsIdempotent(service, userId, product.credits, {
    referenceId: `apple:${transactionId}`,
    paymentMethod: 'apple_iap',
    description: `Purchased ${product.credits} credits (Apple IAP)`,
  })

  return {
    ok: true,
    credits: result.credits,
    granted: result.granted,
  }
})
