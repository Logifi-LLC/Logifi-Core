import type { DigifiScanRow } from '../../app/utils/digifiTypes'
import {
  computeDigifiMaxOutputTokens,
  getDigifiEnv,
  shouldTryNextDigifiModel,
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
import { buildTargetColumns, buildRowBandLabel, targetColumnsIncludeRemarks, DIGIFI_SYSTEM_PROMPT } from './digifiPrompt'
import { parseExtractResponse } from './digifiResponseParser'
import { runDigifiScanOrchestration } from './digifiScanOrchestrator'
import { isScanResponseIncomplete } from './digifiScanValidation'
import { buildVisionContentSequence } from './digifiVisionPayload'

const CLAUDE_MAX_ATTEMPTS = 2
const CLAUDE_RETRY_DELAY_MS = 2500

type ClaudeImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

interface ClaudeTextBlock {
  type: 'text'
  text: string
}

interface ClaudeImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: ClaudeImageMediaType
    data: string
  }
}

export type ClaudeContentBlock = ClaudeTextBlock | ClaudeImageBlock

export interface ClaudeMessagesRequestBody {
  model: string
  max_tokens: number
  temperature: number
  system: string
  messages: Array<{ role: 'user'; content: ClaudeContentBlock[] }>
  thinking?: { type: 'enabled'; budget_tokens: number }
}

function toClaudeMediaType(mimeType: string): ClaudeImageMediaType {
  if (mimeType === 'image/png') return 'image/png'
  if (mimeType === 'image/webp') return 'image/webp'
  return 'image/jpeg'
}

/** Short role-only system prompt — TSV rules live in user prompt (Gemini parity). */
export function buildClaudeSystemPrompt(): string {
  return DIGIFI_SYSTEM_PROMPT
}

function visionSequenceToClaudeBlocks(
  userPrompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[]
): ClaudeContentBlock[] {
  return buildVisionContentSequence(userPrompt, overviewImage, chunkImages).map((item) => {
    if (item.kind === 'text') {
      return { type: 'text' as const, text: item.text }
    }
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: toClaudeMediaType(item.part.mimeType),
        data: item.part.imageBase64,
      },
    }
  })
}

export interface BuildClaudeMessagesOptions {
  temperature: number
  enableThinking: boolean
  thinkingBudgetTokens: number
}

export function buildClaudeMessages(
  model: string,
  userPrompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  maxOutputTokens: number,
  options: BuildClaudeMessagesOptions
): ClaudeMessagesRequestBody {
  const body: ClaudeMessagesRequestBody = {
    model,
    max_tokens: maxOutputTokens,
    temperature: options.temperature,
    system: buildClaudeSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: visionSequenceToClaudeBlocks(userPrompt, overviewImage, chunkImages),
      },
    ],
  }

  if (options.enableThinking) {
    body.thinking = {
      type: 'enabled',
      budget_tokens: options.thinkingBudgetTokens,
    }
  }

  return body
}

function collectClaudeResponseText(
  content: Array<{ type: string; text?: string }> | undefined
): string {
  return (content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('')
    .trim()
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504 || status === 529
}

function isCapacityHttpStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504 || status === 529
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callClaudeRowsOnModel(
  model: string,
  userPrompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows: Set<number> | undefined,
  modelsAttempted: string[],
  maxOutputTokens: number,
  callStats?: DigifiCallStats
): Promise<DigifiScanRow[]> {
  const env = getDigifiEnv()
  const body = buildClaudeMessages(
    model,
    userPrompt,
    overviewImage,
    chunkImages,
    maxOutputTokens,
    {
      temperature: env.claudeTemperature,
      enableThinking: env.claudeEnableThinking,
      thinkingBudgetTokens: env.claudeThinkingBudgetTokens,
    }
  )

  let lastError: DigifiExtractorError | null = null
  for (let attempt = 0; attempt < CLAUDE_MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      if (callStats) callStats.apiRequests += 1
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.anthropicApiKey,
          'anthropic-version': env.claudeApiVersion,
        },
        body: JSON.stringify(body),
      })
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Network request failed'
      lastError = new DigifiExtractorError(
        `Claude network error: ${message}`,
        'CAPACITY',
        [...modelsAttempted, model]
      )
      if (attempt < CLAUDE_MAX_ATTEMPTS - 1) {
        await sleep(CLAUDE_RETRY_DELAY_MS)
        continue
      }
      throw lastError
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const code =
        res.status === 404
          ? 'CONFIG'
          : res.status === 401 || res.status === 403
            ? 'CONFIG'
            : isCapacityHttpStatus(res.status)
              ? 'CAPACITY'
              : 'UNKNOWN'
      lastError = new DigifiExtractorError(
        `Claude API ${res.status}: ${errText.slice(0, 200)}`,
        code,
        [...modelsAttempted, model]
      )
      if (isRetryableHttpStatus(res.status) && attempt < CLAUDE_MAX_ATTEMPTS - 1) {
        await sleep(CLAUDE_RETRY_DELAY_MS)
        continue
      }
      throw lastError
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>
      stop_reason?: string
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const text = collectClaudeResponseText(data.content)
    if (!text) {
      throw new DigifiExtractorError(
        'Claude returned empty response',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }

    if (data.usage?.output_tokens != null) {
      console.info('[digifi] claude scan tokens:', {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        model,
        imageParts: 1 + chunkImages.length,
        maxOutputTokens,
        temperature: env.claudeTemperature,
        thinking: env.claudeEnableThinking,
      })
    }

    const stopReason = data.stop_reason
    if (stopReason === 'max_tokens') {
      console.warn(
        `[digifi] model ${model} hit output token limit (${text.length} chars); response truncated`
      )
      throw new DigifiExtractorError(
        'Claude response was truncated',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }

    try {
      const rows = parseExtractResponse(text, allowedColumnIds, maxRowCount, focusRows)
      logDigifiRawExtractResponse('anthropic', model, text, maxRowCount, rows.length)
      if (rows.length === 0 && stopReason !== 'end_turn') {
        throw new Error('no rows parsed')
      }
      if (!focusRows && isScanResponseIncomplete(rows, maxRowCount)) {
        throw new Error('too few rows parsed')
      }
      return rows
    } catch (error) {
      if (error instanceof DigifiExtractorError) throw error
      logDigifiRawExtractResponse('anthropic', model, text, maxRowCount, 0)
      console.warn(
        `[digifi] invalid TSV from ${model}: ${text.length} chars, stopReason=${stopReason ?? 'unknown'}, tail=${JSON.stringify(text.slice(-120))}`
      )
      throw new DigifiExtractorError(
        stopReason === 'max_tokens'
          ? 'Claude response was truncated'
          : 'Claude returned unparseable text',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }
  }

  throw lastError ?? new DigifiExtractorError('Claude request failed', 'UNKNOWN', modelsAttempted)
}

async function callClaudeRows(
  models: string[],
  prompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows: Set<number> | undefined,
  maxOutputTokens: number,
  options?: { allowFallbackOnInvalidResponse?: boolean; callStats?: DigifiCallStats }
): Promise<{ rows: DigifiScanRow[]; modelUsed: string }> {
  const attempted: string[] = []
  let lastCapacityError: DigifiExtractorError | null = null

  for (const model of models) {
    attempted.push(model)
    try {
      const rows = await callClaudeRowsOnModel(
        model,
        prompt,
        overviewImage,
        chunkImages,
        allowedColumnIds,
        maxRowCount,
        focusRows,
        attempted.slice(0, -1),
        maxOutputTokens,
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
    new DigifiExtractorError('Claude request failed', 'UNKNOWN', attempted)
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

export async function scanLogbookImageWithClaude(
  options: ScanLogbookImageOptions
): Promise<DigifiScanResult> {
  const env = getDigifiEnv()
  if (!env.anthropicApiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }

  const { imageBase64, mimeType, meta, chunkImages = [] } = options
  const targetColumns = buildTargetColumns(meta)
  const sendRowBands = chunkImages.length > 0 && !env.disableRowBandsToGemini
  const hasRemarksFocus = targetColumnsIncludeRemarks(targetColumns)
  const maxOutputTokens = computeDigifiMaxOutputTokens(
    meta.rowCount,
    targetColumns.length,
    env.claudeMaxOutputTokensCap
  )

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
    providerUsed: 'anthropic',
    logLabel: 'claude messages',
    callRows: (models, prompt, overview, chunks, allowedColumnIds, maxRowCount, focusRows, opts) =>
      callClaudeRows(
        models,
        prompt,
        overview,
        chunks,
        allowedColumnIds,
        maxRowCount,
        focusRows,
        maxOutputTokens,
        opts
      ),
  })
}
