import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { digifiScanMetaSchema } from '../../utils/digifiSchema'
import { DigifiGeminiError, getDigifiEnv } from '../../utils/digifiEnv'
import { scanLogbookImageWithGemini } from '../../utils/digifiGemini'
import { normalizeScanRows } from '../../utils/digifiNormalize'
import { personalizeDigifiScanRows } from '../../utils/digifiPersonalization'
import { analyzeDigifiScanRows } from '../../../app/utils/digifiScanDiagnostics'
import { consumeCreditForSpread, linkSpreadChargeToScanSession } from '../../utils/creditsBalance'

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
  const requestStartedAt = Date.now()
  const t: Record<string, number> = {}
  const mark = (key: string) => {
    t[key] = Date.now()
  }

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

  if (!service) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Digifi scanning is not configured on this server',
    })
  }

  mark('afterAuth')
  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart form with image and meta' })
  }

  let imageBuffer: Buffer | null = null
  let imageMime = ''
  let metaRaw = ''
  const extraImageParts = new Map<string, { buffer: Buffer; mimeType: string }>()

  for (const part of parts) {
    if (part.name === 'image' && part.data) {
      imageBuffer = Buffer.from(part.data)
      imageMime = part.type || 'image/jpeg'
    } else if (part.name === 'meta' && part.data) {
      metaRaw = Buffer.from(part.data).toString('utf8')
    } else if (part.name && part.data) {
      extraImageParts.set(part.name, {
        buffer: Buffer.from(part.data),
        mimeType: part.type || 'image/jpeg',
      })
    }
  }

  if (!imageBuffer?.length || !metaRaw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing image or meta field' })
  }

  let meta
  try {
    meta = digifiScanMetaSchema.parse(JSON.parse(metaRaw))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid meta JSON' })
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

  const chunkImages = (meta.chunkedScan?.chunks ?? []).map((chunk) => {
    const part = extraImageParts.get(chunk.partName)
    if (!part?.buffer.length) {
      throw createError({ statusCode: 400, statusMessage: `Missing Digifi chunk image: ${chunk.partName}` })
    }
    if (!ALLOWED_MIME.has(part.mimeType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unsupported chunk image type for ${chunk.partName}. Use JPEG, PNG, or WebP.`,
      })
    }
    return {
      ...chunk,
      imageBase64: part.buffer.toString('base64'),
      mimeType: part.mimeType,
      byteLength: part.buffer.length,
    }
  })

  const totalUploadBytes = imageBuffer.length + chunkImages.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  if (totalUploadBytes > env.maxImageBytes * 4) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Digifi upload is too large after generating row-band images. Try a smaller or more tightly cropped photo.',
    })
  }

  if (meta.layout === 'two-page' && meta.pageSide === 'right') {
    const { count: leftCount } = await supabase
      .from('digifi_scan_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('spread_id', meta.spreadId)
      .eq('page_side', 'left')

    if (!leftCount) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Scan the left page first when using two-page layout.',
      })
    }
  }

  const creditResult = await consumeCreditForSpread(service, userId, {
    spreadId: meta.spreadId,
    layout: meta.layout,
  })
  if (!creditResult.ok) {
    throw createError({
      statusCode: 402,
      statusMessage: 'Insufficient credits. Add pages from your dashboard.',
    })
  }

  mark('afterCreditCheck')

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
    mark('geminiStart')
    geminiResult = await scanLogbookImageWithGemini({
      imageBase64: imageBuffer.toString('base64'),
      mimeType: imageMime,
      meta,
      chunkImages,
    })
    mark('afterGemini')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Scan failed'
    if (msg === 'DIGIFI_NOT_CONFIGURED') {
      throw createError({ statusCode: 503, statusMessage: 'Digifi scanning is not configured' })
    }
    if (e instanceof DigifiGeminiError && e.code === 'CAPACITY') {
      console.error('[digifi] gemini capacity error:', msg, 'models:', e.modelsAttempted.join(' → '))
      throw createError({
        statusCode: 503,
        statusMessage:
          'The AI scan service is busy right now. Wait a minute and try again.',
      })
    }
    if (msg.toLowerCase().includes('fetch failed') || msg.toLowerCase().includes('network error')) {
      console.error('[digifi] gemini network error:', msg)
      throw createError({
        statusCode: 503,
        statusMessage: 'Could not reach the AI scan service. Check connectivity and try again.',
      })
    }
    console.error('[digifi] gemini error:', msg)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not read the logbook page. Try a clearer photo or different lighting.',
    })
  }

  const normalizedRows = normalizeScanRows(geminiResult.rows, meta.columns, meta.defaultYear)
  mark('afterNormalize')
  let personalizedRows = normalizedRows
  let reviewMessages: string[] = []
  let reviewRequiredCount = 0
  try {
    const personalizationStartedAt = Date.now()
    const personalized = await personalizeDigifiScanRows({
      userId,
      supabase,
      rows: geminiResult.rows,
      normalizedRows,
      columns: meta.columns,
    })
    personalizedRows = personalized.rows
    reviewMessages = personalized.reviewMessages
    reviewRequiredCount = personalized.reviewRequiredCount
    t.personalizationMs = Date.now() - personalizationStartedAt
  } catch (error) {
    console.error('[digifi] personalization failed:', error)
  }

  const { error: insertError } = await supabase.from('digifi_scan_sessions').insert({
    id: scanId,
    user_id: userId,
    storage_path: storagePath,
    page_side: meta.pageSide,
    spread_id: meta.spreadId,
    template_name: meta.templateName ?? null,
    layout: meta.layout,
    row_count: meta.rowCount,
    model_used: geminiResult.modelUsed,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('[digifi] session insert failed:', insertError.message)
  } else if (creditResult.charged) {
    await linkSpreadChargeToScanSession(service, userId, meta.spreadId, scanId)
  }

  let filledCellCount = 0
  for (const row of personalizedRows) {
    for (const v of Object.values(row.cells)) {
      if (v.trim()) filledCellCount++
    }
  }

  const rowDiagnostics = analyzeDigifiScanRows(personalizedRows, meta.rowCount)
  const totalMs = Date.now() - requestStartedAt
  const geminiMs = t.afterGemini && t.geminiStart ? t.afterGemini - t.geminiStart : undefined
  const normalizeMs = t.afterNormalize && t.afterGemini ? t.afterNormalize - t.afterGemini : undefined
  console.info('[digifi] scan timing', {
    totalMs,
    geminiMs: geminiMs ?? null,
    normalizeMs: normalizeMs ?? null,
    personalizationMs: t.personalizationMs ?? null,
    fallbackUsed: geminiResult.fallbackUsed,
    modelsAttempted: geminiResult.modelsAttempted,
  })

  return {
    ok: true as const,
    scanId,
    credits: creditResult.balance,
    creditCharged: creditResult.charged,
    rows: personalizedRows,
    filledCellCount,
    modelUsed: geminiResult.modelUsed,
    strategyUsed: geminiResult.strategyUsed,
    chunkCount: geminiResult.chunkCount,
    rescueAttempted: geminiResult.rescueAttempted,
    rescueRecoveredCount: geminiResult.rescueRecoveredCount,
    fallbackUsed: geminiResult.fallbackUsed,
    modelsAttempted: geminiResult.modelsAttempted,
    scanTimings: {
      ...geminiResult.timings,
      totalRequestMs: totalMs,
      geminiMs: geminiMs ?? geminiResult.timings.primaryMs + geminiResult.timings.rescueMs,
      normalizeMs: normalizeMs ?? 0,
      personalizationMs: t.personalizationMs ?? 0,
    },
    rowsReturned: rowDiagnostics.rowsReturned,
    distinctRowIndices: rowDiagnostics.distinctRowIndices,
    missingRowIndices: rowDiagnostics.missingRowIndices,
    duplicateRowIndices: geminiResult.duplicateRowIndices.length > 0
      ? geminiResult.duplicateRowIndices
      : rowDiagnostics.duplicateRowIndices,
    emptyRowIndices: rowDiagnostics.emptyRowIndices,
    hasGaps: rowDiagnostics.hasGaps,
    reviewMessages,
    reviewRequiredCount,
  }
})
