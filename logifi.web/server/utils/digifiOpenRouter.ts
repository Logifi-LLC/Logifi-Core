import type { DigifiScanRow } from '../../app/utils/digifiTypes'
import {
  computeDigifiMaxOutputTokens,
  getDigifiEnv,
  resolveDigifiThinkingLevel,
  type DigifiGeminiThinkingLevel,
} from './digifiEnv'
import {
  DigifiExtractorError,
  type DigifiCallStats,
  type DigifiExtractorErrorCode,
  type DigifiImagePart,
  type DigifiScanResult,
  type ScanLogbookImageOptions,
} from './digifiExtractorTypes'
import { compressDigifiImage } from './digifiImagePrep'
import { logDigifiRawExtractResponse } from './digifiLogResponse'
import { buildTargetColumns, buildRowBandLabel, targetColumnsIncludeRemarks } from './digifiPrompt'
import { parseExtractResponse } from './digifiResponseParser'
import { runDigifiScanOrchestration } from './digifiScanOrchestrator'
import { logDigifiGeminiCallEventSafe, type DigifiScanEventContext } from './digifiScanEvents'
import { isScanResponseIncomplete } from './digifiScanValidation'
import { buildVisionContentSequence } from './digifiVisionPayload'

export const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions'

const OPENROUTER_MAX_ATTEMPTS = 2
const OPENROUTER_RETRY_DELAY_MS = 2500

export interface OpenRouterTextPart {
  type: 'text'
  text: string
}

export interface OpenRouterImagePart {
  type: 'image_url'
  image_url: { url: string }
}

export type OpenRouterContentPart = OpenRouterTextPart | OpenRouterImagePart

export interface OpenRouterProviderPin {
  only: string[]
  allow_fallbacks: false
}

export interface OpenRouterChatRequest {
  model: string
  messages: Array<{ role: 'user'; content: OpenRouterContentPart[] }>
  max_tokens: number
  reasoning: { effort: DigifiGeminiThinkingLevel; exclude: true }
  provider?: OpenRouterProviderPin
}

export interface OpenRouterUsageCounts {
  promptTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

interface OpenRouterChatResponse {
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export type OpenRouterChatResult =
  | {
      ok: true
      text: string
      finishReason: string | null
      usage: OpenRouterUsageCounts
    }
  | {
      ok: false
      status: number
      errorText: string
    }

/** Pin google/* models to the configured provider list. Other ids use OpenRouter routing. */
export function openRouterProviderPin(
  model: string,
  providers: string[]
): OpenRouterProviderPin | undefined {
  if (!model.trim().toLowerCase().startsWith('google/')) return undefined
  const only = providers.map((provider) => provider.trim()).filter(Boolean)
  if (only.length === 0) return undefined
  return { only, allow_fallbacks: false }
}

export function buildOpenRouterChatRequest(
  model: string,
  userPrompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  maxOutputTokens: number,
  thinkingLevel: DigifiGeminiThinkingLevel,
  providers: string[]
): OpenRouterChatRequest {
  const content = buildVisionContentSequence(userPrompt, overviewImage, chunkImages).map((item) => {
    if (item.kind === 'text') {
      return { type: 'text' as const, text: item.text }
    }
    return {
      type: 'image_url' as const,
      image_url: {
        url: `data:${item.part.mimeType};base64,${item.part.imageBase64}`,
      },
    }
  })

  const body: OpenRouterChatRequest = {
    model,
    messages: [{ role: 'user', content }],
    max_tokens: maxOutputTokens,
    reasoning: { effort: thinkingLevel, exclude: true },
  }
  const provider = openRouterProviderPin(model, providers)
  if (provider) body.provider = provider
  return body
}

export function mapOpenRouterUsage(
  usage: OpenRouterChatResponse['usage'] | undefined
): OpenRouterUsageCounts {
  const promptTokens = typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null
  const outputTokens = typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null
  const totalTokens =
    typeof usage?.total_tokens === 'number'
      ? usage.total_tokens
      : promptTokens != null && outputTokens != null
        ? promptTokens + outputTokens
        : null
  return { promptTokens, outputTokens, totalTokens }
}

/** Visible answer only. OpenRouter puts chain-of-thought on message.reasoning, which is ignored. */
export function collectOpenRouterMessageText(
  content: string | Array<{ type?: string; text?: string }> | null | undefined
): string {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content
    .filter((part) => !part.type || part.type === 'text')
    .map((part) => part.text ?? '')
    .join('')
    .trim()
}

function authorizationHeader(apiKey: string): string {
  return `Bearer ${apiKey.replace(/[\r\n]/g, '')}`
}

export async function postOpenRouterChat(
  apiKey: string,
  body: OpenRouterChatRequest
): Promise<OpenRouterChatResult> {
  const res = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorizationHeader(apiKey),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    return { ok: false, status: res.status, errorText: errorText.slice(0, 200) }
  }
  const data = (await res.json()) as OpenRouterChatResponse
  const choice = data.choices?.[0]
  return {
    ok: true,
    text: collectOpenRouterMessageText(choice?.message?.content),
    finishReason: choice?.finish_reason ?? null,
    usage: mapOpenRouterUsage(data.usage),
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

function httpStatusToErrorCode(status: number): DigifiExtractorErrorCode {
  if (status === 401 || status === 403 || status === 404) return 'CONFIG'
  if (status === 429 || status === 503 || status === 504) return 'CAPACITY'
  return 'UNKNOWN'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function redactSecret(text: string, secret: string): string {
  if (!secret) return text
  return text.split(secret).join('[redacted]')
}

export interface OpenRouterExtractOptions {
  maxOutputTokens: number
  thinkingLevel: DigifiGeminiThinkingLevel
  providers: string[]
  callStats?: DigifiCallStats
  scanEventContext?: DigifiScanEventContext
}

export async function extractOpenRouterRows(
  model: string,
  userPrompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows: Set<number> | undefined,
  modelsAttempted: string[],
  generation: OpenRouterExtractOptions
): Promise<DigifiScanRow[]> {
  const env = getDigifiEnv()
  const apiKey = env.openrouterApiKey
  if (!apiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }
  const body = buildOpenRouterChatRequest(
    model,
    userPrompt,
    overviewImage,
    chunkImages,
    generation.maxOutputTokens,
    generation.thinkingLevel,
    generation.providers
  )

  let lastError: DigifiExtractorError | null = null
  for (let attempt = 0; attempt < OPENROUTER_MAX_ATTEMPTS; attempt++) {
    const attemptStartedAt = Date.now()
    let result: OpenRouterChatResult
    try {
      if (generation.callStats) generation.callStats.apiRequests += 1
      result = await postOpenRouterChat(apiKey, body)
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Network request failed'
      lastError = new DigifiExtractorError(
        `OpenRouter network error: ${redactSecret(message, apiKey)}`,
        'CAPACITY',
        [...modelsAttempted, model]
      )
      if (generation.scanEventContext) {
        logDigifiGeminiCallEventSafe({
          context: generation.scanEventContext,
          model,
          promptTokens: null,
          outputTokens: null,
          totalTokens: null,
          latencyMs: Date.now() - attemptStartedAt,
          status: 'error',
          errorCode: 'CAPACITY',
        })
      }
      if (attempt < OPENROUTER_MAX_ATTEMPTS - 1) {
        await sleep(OPENROUTER_RETRY_DELAY_MS)
        continue
      }
      throw lastError
    }

    if (!result.ok) {
      const code = httpStatusToErrorCode(result.status)
      lastError = new DigifiExtractorError(
        `OpenRouter API ${result.status}: ${redactSecret(result.errorText, apiKey)}`,
        code,
        [...modelsAttempted, model]
      )
      if (generation.scanEventContext) {
        logDigifiGeminiCallEventSafe({
          context: generation.scanEventContext,
          model,
          promptTokens: null,
          outputTokens: null,
          totalTokens: null,
          latencyMs: Date.now() - attemptStartedAt,
          status: 'error',
          errorCode: code,
        })
      }
      if (isRetryableHttpStatus(result.status) && attempt < OPENROUTER_MAX_ATTEMPTS - 1) {
        await sleep(OPENROUTER_RETRY_DELAY_MS)
        continue
      }
      throw lastError
    }

    const { text, finishReason, usage } = result
    const latencyMs = Date.now() - attemptStartedAt
    const truncated = finishReason === 'length'

    if (usage.totalTokens != null || usage.promptTokens != null) {
      console.info('[digifi] openrouter scan tokens:', {
        total: usage.totalTokens,
        prompt: usage.promptTokens,
        output: usage.outputTokens,
        reasoningEffort: generation.thinkingLevel,
        model,
        imageParts: 1 + chunkImages.length,
        maxOutputTokens: generation.maxOutputTokens,
      })
    }

    if (!text || truncated) {
      const errorCode: DigifiExtractorErrorCode = 'INVALID_RESPONSE'
      if (generation.scanEventContext) {
        logDigifiGeminiCallEventSafe({
          context: generation.scanEventContext,
          model,
          promptTokens: usage.promptTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          latencyMs,
          status: 'error',
          errorCode,
        })
      }
      throw new DigifiExtractorError(
        truncated ? 'OpenRouter response was truncated' : 'OpenRouter returned empty response',
        errorCode,
        [...modelsAttempted, model]
      )
    }

    try {
      const rows = parseExtractResponse(text, allowedColumnIds, maxRowCount, focusRows)
      logDigifiRawExtractResponse('openrouter', model, text, maxRowCount, rows.length)
      if (rows.length === 0 && finishReason !== 'stop') {
        throw new Error('no rows parsed')
      }
      if (!focusRows && isScanResponseIncomplete(rows, maxRowCount)) {
        throw new Error('too few rows parsed')
      }
      if (generation.scanEventContext) {
        logDigifiGeminiCallEventSafe({
          context: generation.scanEventContext,
          model,
          promptTokens: usage.promptTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          latencyMs,
          status: 'ok',
        })
      }
      return rows
    } catch (error) {
      if (error instanceof DigifiExtractorError) throw error
      logDigifiRawExtractResponse('openrouter', model, text, maxRowCount, 0)
      console.warn(
        `[digifi] invalid TSV from ${model}: ${text.length} chars, finishReason=${finishReason ?? 'unknown'}`
      )
      if (generation.scanEventContext) {
        logDigifiGeminiCallEventSafe({
          context: generation.scanEventContext,
          model,
          promptTokens: usage.promptTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          latencyMs,
          status: 'error',
          errorCode: 'INVALID_RESPONSE',
        })
      }
      throw new DigifiExtractorError(
        'OpenRouter returned unparseable text',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }
  }

  throw lastError ?? new DigifiExtractorError('OpenRouter request failed', 'UNKNOWN', modelsAttempted)
}

async function callOpenRouterRows(
  models: string[],
  prompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows: Set<number> | undefined,
  generation: OpenRouterExtractOptions
): Promise<{ rows: DigifiScanRow[]; modelUsed: string }> {
  const model = models[0]
  if (!model) {
    throw new DigifiExtractorError('OpenRouter model is not configured', 'CONFIG', [])
  }
  const rows = await extractOpenRouterRows(
    model,
    prompt,
    overviewImage,
    chunkImages,
    allowedColumnIds,
    maxRowCount,
    focusRows,
    [],
    generation
  )
  return { rows, modelUsed: model }
}

async function prepareScanImage(base64: string, mimeType: string): Promise<DigifiImagePart> {
  const compressed = await compressDigifiImage(Buffer.from(base64, 'base64'), mimeType)
  return {
    label: 'Logbook page image:',
    imageBase64: compressed.base64,
    mimeType: compressed.mimeType,
  }
}

export async function scanLogbookImageWithOpenRouter(
  options: ScanLogbookImageOptions
): Promise<DigifiScanResult> {
  const env = getDigifiEnv()
  if (!env.openrouterApiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }

  const { imageBase64, mimeType, meta, chunkImages = [] } = options
  const targetColumns = buildTargetColumns(meta)
  const sendRowBands = chunkImages.length > 0 && !env.disableRowBandsToGemini
  const hasRemarksFocus = targetColumnsIncludeRemarks(targetColumns)
  const thinkingLevel = resolveDigifiThinkingLevel(env.geminiThinkingLevel, env.openrouterModel)
  const generation: OpenRouterExtractOptions = {
    maxOutputTokens: computeDigifiMaxOutputTokens(
      meta.rowCount,
      targetColumns.length,
      env.geminiMaxOutputTokensCap
    ),
    thinkingLevel,
    providers: env.openrouterProviders,
    scanEventContext: options.scanEventContext,
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
    providerUsed: 'openrouter',
    logLabel: 'openrouter chat completions',
    fewShotExamples: options.fewShotExamples,
    sessionPriorPages: options.sessionPriorPages,
    modelChain: [env.openrouterModel],
    rethrowIfNoModelFallback: true,
    callRows: (models, prompt, overview, chunks, allowedColumnIds, maxRowCount, focusRows, opts) =>
      callOpenRouterRows(models, prompt, overview, chunks, allowedColumnIds, maxRowCount, focusRows, {
        ...generation,
        callStats: opts?.callStats,
      }),
  })
}
