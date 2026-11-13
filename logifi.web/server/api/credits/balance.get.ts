import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { grantWelcomeCredits, reconcileCreditsBalanceFromLedger } from '../../utils/creditsBalance'

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

  let credits = await reconcileCreditsBalanceFromLedger(service, userId)
  if (credits <= 0) {
    const welcome = await grantWelcomeCredits(service, userId)
    credits = welcome.credits
  }
  return { credits }
})
