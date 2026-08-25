import {
  buildDigifiThinkingConfig,
  computeDigifiMaxOutputTokens,
  getDigifiEnv,
  omitsDigifiGeminiSamplingParams,
  resolveDigifiMediaResolution,
  resolveDigifiThinkingLevel,
  shouldTryNextDigifiModel,
  type DigifiGeminiThinkingLevel,
} from './digifiEnv'
import {
  DigifiExtractorError,
  type DigifiCallStats,
  type DigifiImagePart,
  type DigifiScanResult,
  type ScanLogbookImageOptions,
} from './digifiExtractorTypes'
import { compressDigifiImage } from './digifiImagePrep'
import { logDigifiRawExtractResponse } from './digifiLogResponse'
import { buildTargetColumns, buildRowBandLabel, targetColumnsIncludeRemarks } from './digifiPrompt'
import { parseExtractResponse } from './digifiResponseParser'
import { runDigifiScanOrchestration } from './digifiScanOrchestrator'
import { isScanResponseIncomplete } from './digifiScanValidation'
import type { DigifiScanRow } from '../../app/utils/digifiTypes'

interface DigifiGeminiGenerationOptions {
  maxOutputTokens: number
  mediaResolution: string
  thinkingLevel: DigifiGeminiThinkingLevel
}

/** @deprecated Use DigifiCallStats */
export interface DigifiGeminiCallStats {
  generateContentRequests: number
}

/** Initial request + one backoff retry per model (avoids triple-billing the same call). */
const GEMINI_MAX_ATTEMPTS = 2
const GEMINI_RETRY_DELAY_MS = 2500

function collectGeminiResponseText(
  parts: Array<{ text?: string }> | undefined
): string {
  return (parts ?? []).map((part) => part.text ?? '').join('').trim()
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

function isCapacityHttpStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGeminiRowsOnModel(
  model: string,
  prompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows: Set<number> | undefined,
  modelsAttempted: string[],
  generation: DigifiGeminiGenerationOptions,
  callStats?: DigifiCallStats
): Promise<DigifiScanRow[]> {
  const env = getDigifiEnv()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: prompt },
    { text: overviewImage.label },
    {
      inline_data: {
        mime_type: overviewImage.mimeType,
        data: overviewImage.imageBase64,
      },
    },
  ]

  for (const chunk of chunkImages) {
    parts.push({ text: chunk.label })
    parts.push({
      inline_data: {
        mime_type: chunk.mimeType,
        data: chunk.imageBase64,
      },
    })
  }

  const thinkingConfig = buildDigifiThinkingConfig(model, generation.thinkingLevel)

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: generation.maxOutputTokens,
    mediaResolution: generation.mediaResolution,
    thinkingConfig,
  }
  // 3.6 Flash deprecates sampling params (ignored now; may 400 later). Keep 0.1 for older Gemini.
  if (!omitsDigifiGeminiSamplingParams(model)) {
    generationConfig.temperature = 0.1
  }

  const body = {
    contents: [{ parts }],
    generationConfig,
  }

  let lastError: DigifiExtractorError | null = null
  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      if (callStats) callStats.apiRequests += 1
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Network request failed'
      lastError = new DigifiExtractorError(
        `Gemini network error: ${message}`,
        'CAPACITY',
        [...modelsAttempted, model]
      )
      if (attempt < GEMINI_MAX_ATTEMPTS - 1) {
        await sleep(GEMINI_RETRY_DELAY_MS)
        continue
      }
      throw lastError
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const code =
        res.status === 404
          ? 'CONFIG'
          : isCapacityHttpStatus(res.status)
            ? 'CAPACITY'
            : 'UNKNOWN'
      lastError = new DigifiExtractorError(
        `Gemini API ${res.status}: ${errText.slice(0, 200)}`,
        code,
        [...modelsAttempted, model]
      )
      if (isRetryableHttpStatus(res.status) && attempt < GEMINI_MAX_ATTEMPTS - 1) {
        await sleep(GEMINI_RETRY_DELAY_MS)
        continue
      }
      throw lastError
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
        finishReason?: string
      }>
      usageMetadata?: {
        totalTokenCount?: number
        promptTokenCount?: number
        candidatesTokenCount?: number
        thoughtsTokenCount?: number
      }
    }
    const candidate = data.candidates?.[0]
    const text = collectGeminiResponseText(candidate?.content?.parts)
    if (!text) {
      throw new DigifiExtractorError(
        'Gemini returned empty response',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }

    const usage = data.usageMetadata
    if (usage?.totalTokenCount != null) {
      console.info('[digifi] scan tokens:', {
        total: usage.totalTokenCount,
        prompt: usage.promptTokenCount,
        output: usage.candidatesTokenCount,
        thinking: usage.thoughtsTokenCount ?? 0,
        thinkingConfig,
        model,
        imageParts: 1 + chunkImages.length,
        maxOutputTokens: generation.maxOutputTokens,
      })
    }

    const finishReason = candidate?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      console.warn(
        `[digifi] model ${model} hit output token limit (${text.length} chars, thinking=${usage?.thoughtsTokenCount ?? '?'}); response truncated`
      )
      throw new DigifiExtractorError(
        'Gemini response was truncated',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }

    try {
      const rows = parseExtractResponse(text, allowedColumnIds, maxRowCount, focusRows)
      logDigifiRawExtractResponse('gemini', model, text, maxRowCount, rows.length)
      if (rows.length === 0 && finishReason !== 'STOP') {
        throw new Error('no rows parsed')
      }
      if (!focusRows && isScanResponseIncomplete(rows, maxRowCount)) {
        throw new Error('too few rows parsed')
      }
      return rows
    } catch (error) {
      if (error instanceof DigifiExtractorError) throw error
      logDigifiRawExtractResponse('gemini', model, text, maxRowCount, 0)
      console.warn(
        `[digifi] invalid TSV from ${model}: ${text.length} chars, finishReason=${finishReason ?? 'unknown'}, tail=${JSON.stringify(text.slice(-120))}`
      )
      throw new DigifiExtractorError(
        finishReason === 'MAX_TOKENS'
          ? 'Gemini response was truncated'
          : 'Gemini returned unparseable text',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }
  }

  throw lastError ?? new DigifiExtractorError('Gemini request failed', 'UNKNOWN', modelsAttempted)
}

async function callGeminiRows(
  models: string[],
  prompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows: Set<number> | undefined,
  generation: DigifiGeminiGenerationOptions,
  options?: { allowFallbackOnInvalidResponse?: boolean; callStats?: DigifiCallStats }
): Promise<{ rows: DigifiScanRow[]; modelUsed: string }> {
  const attempted: string[] = []
  let lastCapacityError: DigifiExtractorError | null = null

  for (const model of models) {
    attempted.push(model)
    try {
      const rows = await callGeminiRowsOnModel(
        model,
        prompt,
        overviewImage,
        chunkImages,
        allowedColumnIds,
        maxRowCount,
        focusRows,
        attempted.slice(0, -1),
        generation,
        options?.callStats
      )
      if (attempted.length > 1) {
        console.info(
          `[digifi] scan succeeded with fallback model ${model} (tried: ${attempted.join(' → ')})`
        )
      }
      return { rows, modelUsed: model }
    } catch (error) {
      if (!(error instanceof DigifiExtractorError)) {
        throw error
      }
      if (error.code === 'INVALID_RESPONSE' && options?.allowFallbackOnInvalidResponse === false) {
        throw new DigifiExtractorError(error.message, error.code, attempted)
      }
      const isLastModel = model === models[models.length - 1]
      if (shouldTryNextDigifiModel(error.code) && !isLastModel) {
        const reason =
          error.code === 'CAPACITY'
            ? `unavailable (${error.message.slice(0, 80)}…)`
            : error.message
        console.warn(`[digifi] model ${model} ${reason}, trying ${models[attempted.length]}`)
        if (error.code === 'CAPACITY') {
          lastCapacityError = error
        }
        continue
      }
      throw new DigifiExtractorError(error.message, error.code, attempted)
    }
  }

  throw (
    lastCapacityError ??
    new DigifiExtractorError('Gemini request failed', 'UNKNOWN', attempted)
  )
}

async function prepareScanImage(base64: string, mimeType: string): Promise<DigifiImagePart> {
  const compressed = await compressDigifiImage(Buffer.from(base64, 'base64'), mimeType)
  return {
    label: 'Logbook page image:',
    imageBase64: compressed.base64,
    mimeType: compressed.mimeType,
  }
}

export async function scanLogbookImageWithGemini(
  options: ScanLogbookImageOptions
): Promise<DigifiScanResult> {
  const env = getDigifiEnv()
  if (!env.geminiApiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }

  const { imageBase64, mimeType, meta, chunkImages = [] } = options
  const targetColumns = buildTargetColumns(meta)
  const sendRowBands = chunkImages.length > 0 && !env.disableRowBandsToGemini
  const hasRemarksFocus = targetColumnsIncludeRemarks(targetColumns)
  const thinkingLevel = resolveDigifiThinkingLevel(env.geminiThinkingLevel, env.model)
  const generation: DigifiGeminiGenerationOptions = {
    maxOutputTokens: computeDigifiMaxOutputTokens(
      meta.rowCount,
      targetColumns.length,
      env.geminiMaxOutputTokensCap
    ),
    mediaResolution: resolveDigifiMediaResolution(env.geminiMediaResolution),
    thinkingLevel,
  }

  const overviewImage = await prepareScanImage(imageBase64, mimeType)
  const labeledChunks = sendRowBands
    ? await Promise.all(
        chunkImages.map(async (chunk) => {
          const compressed = await compressDigifiImage(
            Buffer.from(chunk.imageBase64, 'base64'),
            chunk.mimeType
          )
          return {
            label: buildRowBandLabel(chunk.rowStart, chunk.rowEnd, hasRemarksFocus),
            imageBase64: compressed.base64,
            mimeType: compressed.mimeType,
            rowStart: chunk.rowStart,
            rowEnd: chunk.rowEnd,
          }
        })
      )
    : []

  return runDigifiScanOrchestration({
    meta,
    targetColumns,
    chunkImages,
    overviewImage,
    labeledChunks,
    providerUsed: 'gemini',
    logLabel: 'gemini generateContent',
    callRows: (models, prompt, overview, chunks, allowedColumnIds, maxRowCount, focusRows, opts) =>
      callGeminiRows(
        models,
        prompt,
        overview,
        chunks,
        allowedColumnIds,
        maxRowCount,
        focusRows,
        generation,
        opts
      ),
  })
}
