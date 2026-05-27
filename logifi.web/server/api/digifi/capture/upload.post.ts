import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { randomUUID } from 'node:crypto'
import { getSupabaseServiceClient } from '../../../utils/supabaseService'
import {
  DIGIFI_CAPTURE_ALLOWED_MIME,
  DIGIFI_CAPTURE_BUCKET,
  DIGIFI_CAPTURE_MAX_IMAGE_BYTES,
  extForCaptureMime,
} from '../../../utils/digifiCapture'

export default defineEventHandler(async (event) => {
  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Capture service is not configured' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart form data' })
  }

  let token = ''
  let imageBuffer: Buffer | null = null
  let imageMime = 'image/jpeg'

  for (const part of parts) {
    if (part.name === 'token' && part.data) {
      token = Buffer.from(part.data).toString('utf8').trim()
    }
    if (part.name === 'image' && part.data) {
      imageBuffer = Buffer.from(part.data)
      imageMime = part.type || 'image/jpeg'
    }
  }

  if (!token || !imageBuffer?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token or image' })
  }
  if (!DIGIFI_CAPTURE_ALLOWED_MIME.has(imageMime)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type. Use JPEG, PNG, or WebP.' })
  }
  if (imageBuffer.length > DIGIFI_CAPTURE_MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Image too large. Maximum file size is 8 MB.' })
  }

  const { data: session, error: sessionError } = await service
    .from('digifi_capture_sessions')
    .select('id, user_id, status, expires_at, max_photos')
    .eq('token', token)
    .maybeSingle()

  if (sessionError) {
    console.error('[digifi-capture] session lookup failed:', sessionError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not validate capture session' })
  }
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Capture session not found' })
  }
  if (session.status !== 'active') {
    throw createError({ statusCode: 409, statusMessage: 'Capture session is closed' })
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    throw createError({ statusCode: 410, statusMessage: 'Capture session has expired' })
  }

  const { count, error: countError } = await service
    .from('digifi_capture_photos')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)
  if (countError) {
    console.error('[digifi-capture] photo count failed:', countError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not validate capture limits' })
  }
  if ((count ?? 0) >= session.max_photos) {
    throw createError({ statusCode: 429, statusMessage: 'Capture session photo limit reached' })
  }

  const photoId = randomUUID()
  const ext = extForCaptureMime(imageMime)
  const storagePath = `${session.user_id}/${session.id}/${photoId}.${ext}`

  const { error: uploadError } = await service.storage
    .from(DIGIFI_CAPTURE_BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType: imageMime,
      upsert: false,
    })
  if (uploadError) {
    console.error('[digifi-capture] upload failed:', uploadError.message)
    throw createError({ statusCode: 502, statusMessage: 'Could not upload image' })
  }

  const { error: insertError } = await service.from('digifi_capture_photos').insert({
    id: photoId,
    session_id: session.id,
    user_id: session.user_id,
    storage_path: storagePath,
    mime_type: imageMime,
    byte_size: imageBuffer.length,
    capture_source: 'mobile-web',
    metadata: {},
  })

  if (insertError) {
    console.error('[digifi-capture] photo insert failed:', insertError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not store capture metadata' })
  }

  return {
    ok: true as const,
    photoId,
    sessionId: session.id,
  }
})
