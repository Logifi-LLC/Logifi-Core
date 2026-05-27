import { createError, defineEventHandler, getQuery } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../../utils/supabase'
import { getSupabaseServiceClient } from '../../../utils/supabaseService'
import { DIGIFI_CAPTURE_BUCKET } from '../../../utils/digifiCapture'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { sessionId } = getQuery(event)
  if (typeof sessionId !== 'string' || !sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sessionId' })
  }

  const supabase = getSupabaseClient(event)
  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Capture service is not configured' })
  }

  const { data: session, error: sessionError } = await supabase
    .from('digifi_capture_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (sessionError || !session) {
    throw createError({ statusCode: 404, statusMessage: 'Capture session not found' })
  }

  const { data: photos, error: photosError } = await supabase
    .from('digifi_capture_photos')
    .select('id, storage_path, mime_type, byte_size, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (photosError) {
    console.error('[digifi-capture] photo list failed:', photosError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not load capture photos' })
  }

  const paths = (photos ?? []).map((photo) => photo.storage_path)
  const { data: signedData, error: signedError } = await service.storage
    .from(DIGIFI_CAPTURE_BUCKET)
    .createSignedUrls(paths, 60 * 10)
  if (signedError) {
    console.error('[digifi-capture] signed URL create failed:', signedError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not sign capture image URLs' })
  }

  return {
    ok: true as const,
    photos: (photos ?? []).map((photo, idx) => ({
      id: photo.id,
      mimeType: photo.mime_type,
      byteSize: photo.byte_size,
      createdAt: photo.created_at,
      signedUrl: signedData[idx]?.signedUrl ?? null,
    })),
  }
})
