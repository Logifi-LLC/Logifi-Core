import { createError, defineEventHandler } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../../utils/supabase'
import {
  buildMobileCaptureUrl,
  DIGIFI_CAPTURE_MAX_PHOTOS_PER_SESSION,
  DIGIFI_CAPTURE_SESSION_TTL_MS,
  generateDigifiCaptureToken,
} from '../../../utils/digifiCapture'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseClient(event)
  const token = generateDigifiCaptureToken()
  const expiresAt = new Date(Date.now() + DIGIFI_CAPTURE_SESSION_TTL_MS).toISOString()

  const { data, error } = await supabase
    .from('digifi_capture_sessions')
    .insert({
      user_id: userId,
      token,
      status: 'active',
      max_photos: DIGIFI_CAPTURE_MAX_PHOTOS_PER_SESSION,
      expires_at: expiresAt,
    })
    .select('id, token, expires_at')
    .single()

  if (error || !data) {
    console.error('[digifi-capture] failed to create session:', error?.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not create capture session' })
  }

  return {
    ok: true as const,
    sessionId: data.id,
    token: data.token,
    expiresAt: data.expires_at,
    mobileUrl: buildMobileCaptureUrl(event, data.token),
  }
})
