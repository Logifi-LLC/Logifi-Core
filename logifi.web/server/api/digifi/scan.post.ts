import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { digifiScanMetaSchema } from '../../utils/digifiSchema'
import { getDigifiEnv } from '../../utils/digifiEnv'
import { scanLogbookImageWithGemini } from '../../utils/digifiGemini'
import { normalizeScanRows } from '../../utils/digifiNormalize'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Digifi: scan a paper logbook page image and return structured grid rows.
 * Multipart: `image` (file), `meta` (JSON string).
 * Requires Authorization: Bearer <supabase_access_token>.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const env = getDigifiEnv()
  if (!env.geminiApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Digifi scanning is not configured on this server',
    })
  }

  const supabase = getSupabaseClient(event)
  const service = getSupabaseServiceClient()

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('digifi_scan_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', dayAgo)

  if (countError) {
    console.error('[digifi] rate limit check failed:', countError.message)
  } else if ((count ?? 0) >= env.maxScansPerDay) {
    throw createError({
      statusCode: 429,
      statusMessage: `Daily scan limit reached (${env.maxScansPerDay} per day). Try again tomorrow.`,
    })
  }

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart form with image and meta' })
  }

  let imageBuffer: Buffer | null = null
  let imageMime = ''
  let metaRaw = ''

  for (const part of parts) {
    if (part.name === 'image' && part.data) {
      imageBuffer = Buffer.from(part.data)
      imageMime = part.type || 'image/jpeg'
    }
    if (part.name === 'meta' && part.data) {
      metaRaw = Buffer.from(part.data).toString('utf8')
    }
  }

  if (!imageBuffer?.length || !metaRaw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing image or meta field' })
  }

  if (imageBuffer.length > env.maxImageBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Image is too large. Please use a smaller photo (max 8 MB).',
    })
  }

  if (!ALLOWED_MIME.has(imageMime)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported image type. Use JPEG, PNG, or WebP.',
    })
  }

  let meta
  try {
    meta = digifiScanMetaSchema.parse(JSON.parse(metaRaw))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid meta JSON' })
  }

  if (meta.layout === 'two-page' && meta.pageSide === 'right') {
    const { count: leftCount } = await supabase
      .from('digifi_scan_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('page_side', 'left')
      .gte('created_at', dayAgo)

    if (!leftCount) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Scan the left page first when using two-page layout.',
      })
    }
  }

  const scanId = randomUUID()
  const ext = extForMime(imageMime)
  const storagePath = `${userId}/${scanId}.${ext}`

  if (service) {
    const { error: uploadError } = await service.storage
      .from('digifi-scans')
      .upload(storagePath, imageBuffer, {
        contentType: imageMime,
        upsert: false,
      })
    if (uploadError) {
      console.error('[digifi] storage upload failed:', uploadError.message)
    }
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  let geminiResult
  try {
    geminiResult = await scanLogbookImageWithGemini(
      imageBuffer.toString('base64'),
      imageMime,
      meta
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Scan failed'
    if (msg === 'DIGIFI_NOT_CONFIGURED') {
      throw createError({ statusCode: 503, statusMessage: 'Digifi scanning is not configured' })
    }
    console.error('[digifi] gemini error:', msg)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not read the logbook page. Try a clearer photo or different lighting.',
    })
  }

  const normalizedRows = normalizeScanRows(geminiResult.rows, meta.columns, meta.defaultYear)

  const { error: insertError } = await supabase.from('digifi_scan_sessions').insert({
    id: scanId,
    user_id: userId,
    storage_path: storagePath,
    page_side: meta.pageSide,
    template_name: meta.templateName ?? null,
    layout: meta.layout,
    row_count: meta.rowCount,
    model_used: geminiResult.modelUsed,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('[digifi] session insert failed:', insertError.message)
  }

  let filledCellCount = 0
  for (const row of normalizedRows) {
    for (const v of Object.values(row.cells)) {
      if (v.trim()) filledCellCount++
    }
  }

  return {
    ok: true as const,
    scanId,
    rows: normalizedRows,
    filledCellCount,
    modelUsed: geminiResult.modelUsed,
  }
})
