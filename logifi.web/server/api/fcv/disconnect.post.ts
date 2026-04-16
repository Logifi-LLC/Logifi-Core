import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'

/**
 * Disconnect FC View integration for the current user.
 * This removes the user's row from the fcv_integrations table, deleting their stored tokens.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const supabase = getSupabaseClient(event)
  
  const { error } = await supabase
    .from('fcv_integrations')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to disconnect FC View:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to disconnect FC View integration',
    })
  }

  return { success: true }
})
