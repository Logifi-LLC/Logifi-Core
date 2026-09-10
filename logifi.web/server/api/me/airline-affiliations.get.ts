import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { mapFlicaIntegrationsToAffiliations } from '../../utils/flicaAffiliations'

/**
 * List FLICA airline integrations for the authenticated user.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseClient(event)
  const { data, error } = await supabase
    .from('flica_integrations')
    .select('airline_code, portal_host, username, last_ok_at, last_error, updated_at')
    .eq('user_id', userId)
    .order('airline_code', { ascending: true })

  if (error) {
    console.error('flica_integrations list failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load affiliations' })
  }

  return { affiliations: mapFlicaIntegrationsToAffiliations(data ?? []) }
})
