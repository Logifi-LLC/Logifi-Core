import { defineEventHandler, createError, readBody } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'

interface DisconnectBody {
  airlineCode?: string
}

/**
 * Remove stored FLICA credentials for the current user.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  let airlineCode = 'RJET'
  try {
    const body = (await readBody(event)) as DisconnectBody | null
    if (typeof body?.airlineCode === 'string' && body.airlineCode.trim()) {
      airlineCode = body.airlineCode.trim().toUpperCase()
    }
  } catch {
    /* empty body ok */
  }

  const supabase = getSupabaseClient(event)
  const { error } = await supabase
    .from('flica_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('airline_code', airlineCode)

  if (error) {
    console.error('Failed to disconnect FLICA:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to disconnect FLICA integration',
    })
  }

  return { success: true }
})
