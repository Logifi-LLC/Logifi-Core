import { createError, defineEventHandler, getQuery } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { GUEST_SIGN_BUCKET } from '../../utils/guestSign'

export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { entryId } = getQuery(event)
  if (typeof entryId !== 'string' || !entryId.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'entryId is required' })
  }

  const supabase = getSupabaseClient(event)
  const { data: entry, error: entryError } = await supabase
    .from('log_entries')
    .select('id')
    .eq('id', entryId.trim())
    .eq('user_id', userId)
    .maybeSingle()

  if (entryError || !entry) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  const { data: signature, error: sigError } = await supabase
    .from('flight_signatures')
    .select('drawn_signature_url')
    .eq('log_entry_id', entry.id)
    .maybeSingle()

  if (sigError) {
    console.error('[flight-signature] signature lookup failed:', sigError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not load signature' })
  }

  const storagePath = signature?.drawn_signature_url?.trim()
  if (!storagePath) {
    return { ok: true as const, url: null }
  }

  if (/^https?:\/\//i.test(storagePath)) {
    return { ok: true as const, url: storagePath }
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Signature image service is not configured' })
  }

  const normalizedPath = storagePath.replace(/^flight-signatures\//, '')
  const { data, error: urlError } = await service.storage
    .from(GUEST_SIGN_BUCKET)
    .createSignedUrl(normalizedPath, 60 * 60)

  if (urlError) {
    console.error('[flight-signature] signed URL failed:', urlError.message)
    throw createError({ statusCode: 502, statusMessage: 'Could not sign image URL' })
  }

  return { ok: true as const, url: data?.signedUrl ?? null }
})