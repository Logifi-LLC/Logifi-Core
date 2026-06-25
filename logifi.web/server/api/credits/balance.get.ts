import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { reconcileCreditsBalanceFromLedger } from '../../utils/creditsBalance'

/**
 * Returns the authenticated user's Digifi page credit balance.
 */
export default defineEventHandler(async (event) => {
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

  const credits = await reconcileCreditsBalanceFromLedger(service, userId)
  return { credits }
})
