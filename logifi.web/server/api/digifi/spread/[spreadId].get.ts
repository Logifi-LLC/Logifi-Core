import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../../utils/supabase'
import {
  mapSessionsToSpreadRecovery,
  validateSpreadIdParam,
} from '../../../utils/digifiSpreadRecovery'

/**
 * Recover persisted Digifi scan results for a builder spread (24h TTL).
 * Requires Authorization: Bearer <supabase_access_token>.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  let spreadId: string
  try {
    spreadId = validateSpreadIdParam(getRouterParam(event, 'spreadId'))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid spread id' })
  }

  const supabase = getSupabaseClient(event)
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('digifi_scan_sessions')
    .select('id, spread_id, scan_payload, created_at')
    .eq('user_id', userId)
    .eq('spread_id', spreadId)
    .gt('expires_at', nowIso)
    .not('scan_payload', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[digifi] spread recovery query failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load scan recovery data' })
  }

  return mapSessionsToSpreadRecovery(spreadId, data ?? [])
})
