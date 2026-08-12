import { defineEventHandler, getQuery } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'

/**
 * Return whether the current user has FLICA connected.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    return { connected: false }
  }

  const query = getQuery(event)
  const airlineCode =
    typeof query.airlineCode === 'string' && query.airlineCode.trim()
      ? query.airlineCode.trim().toUpperCase()
      : 'RJET'

  const supabase = getSupabaseClient(event)
  const { data } = await supabase
    .from('flica_integrations')
    .select('airline_code, username, last_ok_at, portal_host')
    .eq('user_id', userId)
    .eq('airline_code', airlineCode)
    .maybeSingle()

  if (!data) {
    return { connected: false, airlineCode }
  }

  return {
    connected: true,
    airlineCode: data.airline_code,
    username: data.username,
    lastOkAt: data.last_ok_at,
    portalHost: data.portal_host,
  }
})
