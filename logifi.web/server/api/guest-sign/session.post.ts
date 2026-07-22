import { createError, defineEventHandler, readBody } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import {
  buildMobileGuestSignUrl,
  GUEST_SIGN_SESSION_TTL_MS,
  generateGuestSignToken,
} from '../../utils/guestSign'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ entryId?: string }>(event)
  const entryId = typeof body?.entryId === 'string' ? body.entryId.trim() : ''
  if (!entryId) {
    throw createError({ statusCode: 400, statusMessage: 'entryId is required' })
  }

  const supabase = getSupabaseClient(event)

  const { data: entry, error: entryError } = await supabase
    .from('log_entries')
    .select('id, user_id, is_imported, data_hash')
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle()

  if (entryError) {
    console.error('[guest-sign] entry lookup failed:', entryError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not load entry' })
  }
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }
  if (entry.is_imported) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Imported entries cannot be signed electronically',
    })
  }
  if (!entry.data_hash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entry must sync to the cloud before guest signing',
    })
  }

  const { data: existingSig } = await supabase
    .from('flight_signatures')
    .select('id')
    .eq('log_entry_id', entryId)
    .maybeSingle()

  if (existingSig) {
    throw createError({ statusCode: 409, statusMessage: 'Entry is already signed' })
  }

  // Cancel other pending sessions for this entry
  await supabase
    .from('guest_sign_sessions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('log_entry_id', entryId)
    .eq('status', 'pending')

  const token = generateGuestSignToken()
  const expiresAt = new Date(Date.now() + GUEST_SIGN_SESSION_TTL_MS).toISOString()

  const { data, error } = await supabase
    .from('guest_sign_sessions')
    .insert({
      user_id: userId,
      log_entry_id: entryId,
      token,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id, token, expires_at')
    .single()

  if (error || !data) {
    console.error('[guest-sign] failed to create session:', error?.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not create guest sign session' })
  }

  return {
    ok: true as const,
    sessionId: data.id,
    token: data.token,
    expiresAt: data.expires_at,
    mobileUrl: buildMobileGuestSignUrl(event, data.token),
  }
})
