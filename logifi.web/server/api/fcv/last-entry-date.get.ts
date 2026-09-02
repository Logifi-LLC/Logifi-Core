import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { normalizeCalendarYmd } from '../../../shared/localCalendarDate'

/**
 * Returns user's most recent logbook entry date (YYYY-MM-DD), if any.
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
  const { data, error } = await supabase
    .from('log_entries')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)

  if (error) {
    console.error('failed loading latest logbook date:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load latest logbook entry date',
    })
  }

  const raw =
    Array.isArray(data) && data.length > 0 && typeof data[0]?.date === 'string'
      ? data[0].date
      : null
  const date = normalizeCalendarYmd(raw)

  return { date }
})
