import { defineEventHandler, createError, getQuery } from 'h3'
import { getUserIdFromEvent } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { listCreditTransactions } from '../../utils/creditsBalance'

/**
 * Recent credit ledger entries for the authenticated user.
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

  const query = getQuery(event)
  const limitRaw = query.limit
  const limit =
    typeof limitRaw === 'string' && limitRaw
      ? Number.parseInt(limitRaw, 10)
      : 20

  const transactions = await listCreditTransactions(service, userId, limit)
  return { transactions }
})
