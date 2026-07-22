import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import {
  extForGuestSignMime,
  GUEST_SIGN_ALLOWED_MIME,
  GUEST_SIGN_BUCKET,
  GUEST_SIGN_MAX_IMAGE_BYTES,
} from '../../utils/guestSign'

export default defineEventHandler(async (event) => {
  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Guest sign service is not configured' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart form data' })
  }

  let token = ''
  let guestName = ''
  let guestCertificate = ''
  let imageBuffer: Buffer | null = null
  let imageMime = 'image/png'

  for (const part of parts) {
    if (part.name === 'token' && part.data) {
      token = Buffer.from(part.data).toString('utf8').trim()
    }
    if (part.name === 'guestName' && part.data) {
      guestName = Buffer.from(part.data).toString('utf8').trim()
    }
    if (part.name === 'guestCertificate' && part.data) {
      guestCertificate = Buffer.from(part.data).toString('utf8').trim()
    }
    if (part.name === 'signature' && part.data) {
      imageBuffer = Buffer.from(part.data)
      imageMime = part.type || 'image/png'
    }
  }

  if (!token || !imageBuffer?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token or signature image' })
  }
  if (!guestName) {
    throw createError({ statusCode: 400, statusMessage: 'Guest name is required' })
  }
  if (!GUEST_SIGN_ALLOWED_MIME.has(imageMime)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type. Use PNG, WebP, or JPEG.' })
  }
  if (imageBuffer.length > GUEST_SIGN_MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Signature image too large (max 2 MB)' })
  }

  const { data: session, error: sessionError } = await service
    .from('guest_sign_sessions')
    .select('id, user_id, log_entry_id, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (sessionError) {
    console.error('[guest-sign] session lookup failed:', sessionError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not validate session' })
  }
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Guest sign session not found' })
  }
  if (session.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Session is no longer pending' })
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await service
      .from('guest_sign_sessions')
      .update({ status: 'expired' })
      .eq('id', session.id)
    throw createError({ statusCode: 410, statusMessage: 'Session has expired' })
  }

  const ext = extForGuestSignMime(imageMime)
  const storagePath = `${session.user_id}/${session.log_entry_id}.${ext}`

  const { error: uploadError } = await service.storage
    .from(GUEST_SIGN_BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType: imageMime,
      upsert: true,
    })

  if (uploadError) {
    console.error('[guest-sign] upload failed:', uploadError.message)
    throw createError({ statusCode: 502, statusMessage: 'Could not upload signature' })
  }

  const { data: signatureId, error: rpcError } = await service.rpc(
    'guest_sign_log_entry_for_session',
    {
      p_session_token: token,
      p_guest_name: guestName,
      p_guest_certificate_number: guestCertificate || null,
      p_drawn_signature_url: storagePath,
    }
  )

  if (rpcError) {
    console.error('[guest-sign] RPC failed:', rpcError.message)
    throw createError({
      statusCode: 400,
      statusMessage: rpcError.message || 'Could not complete guest signature',
    })
  }

  return {
    ok: true as const,
    signatureId,
    logEntryId: session.log_entry_id,
  }
})
