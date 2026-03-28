import { defineEventHandler } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'

/**
 * Return whether the current user has FC View connected.
 * Client must send Authorization: Bearer <supabase_access_token>.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    return { connected: false }
  }

  const supabase = getSupabaseClient(event)
  const { data } = await supabase
    .from('fcv_integrations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  return { connected: !!data }
})
