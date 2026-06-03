import {
  APPROACH_TYPE_OPTIONS,
  CATEGORY_CLASS_OPTIONS,
  PILOT_ROLE_OPTIONS,
  ROLE_OPTIONS,
} from '../../app/utils/logbookBuilderTypes'
import { analyzeDigifiScanRows } from '../../app/utils/digifiScanDiagnostics'
import type { DigifiScanRow, DigifiScanStrategy, DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import type { LogbookColumnKey } from '../../app/utils/logbookTypes'
import type { DigifiScanMetaInput } from './digifiSchema'
import {
  buildDigifiThinkingConfig,
  computeDigifiMaxOutputTokens,
  DigifiGeminiError,
  getDigifiEnv,
  getDigifiModelChain,
  resolveDigifiMediaResolution,
  resolveDigifiThinkingLevel,
  shouldTryNextDigifiModel,
  type DigifiGeminiThinkingLevel,
} from './digifiEnv'
import { compressDigifiImageForGemini } from './digifiImagePrep'
import { countRowsWithCells, isScanResponseIncomplete } from './digifiScanValidation'
import { parseDigifiTsvResponse } from './digifiTsvParser'

interface DigifiGeminiGenerationOptions {
  maxOutputTokens: number
  mediaResolution: string
  thinkingLevel: DigifiGeminiThinkingLevel
}

/** Counts each generativelanguage.googleapis.com generateContent HTTP request (incl. retries). */
export interface DigifiGeminiCallStats {
  generateContentRequests: number
}

/** Initial request + one backoff retry per model (avoids triple-billing the same call). */
const GEMINI_MAX_ATTEMPTS = 2
const GEMINI_RETRY_DELAY_MS = 2500

interface DigifiImagePart {
  label: string
  imageBase64: string
  mimeType: string
}

interface ScanLogbookImageWithGeminiOptions {
  imageBase64: string
  mimeType: string
  meta: DigifiScanMetaInput
  chunkImages?: Array<{
    partName: string
    rowStart: number
    rowEnd: number
    imageBase64: string
    mimeType: string
  }>
}

export interface DigifiScanTimings {
  primaryMs: number
  rescueMs: number
  totalMs: number
}

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

function columnTypeHint(fieldKey: LogbookColumnKey | null): string {
  if (!fieldKey) return 'text'
  if (fieldKey === 'date') return 'date'
  if (
    [
      'pic',
      'sic',
      'dualR',
      'solo',
      'night',
      'actual',
      'hood',
      'dualG',
      'xc',
      'dayLandings',
      'nightLandings',
      'approach',
      'total',
    ].includes(fieldKey)
  ) {
    return 'decimal time or count'
  }
  if (fieldKey === 'role') return ROLE_OPTIONS.map((r) => r.value).join('|')
  if (fieldKey === 'approachType') return APPROACH_TYPE_OPTIONS.join('|')
  if (fieldKey === 'categoryClass') return CATEGORY_CLASS_OPTIONS.join('|')
  if (fieldKey === 'pilotRole') return PILOT_ROLE_OPTIONS.filter((p) => p.value).map((p) => p.value).join('|')
  if (fieldKey === 'departure' || fieldKey === 'destination') return 'airport code'
  if (fieldKey === 'route') return 'route codes'
  return 'text'
}

function buildAirportPromptRules(columns: DigifiTemplateColumn[]): string {
  const hasDeparture = columns.some((c) => c.fieldKey === 'departure')
  const hasDestination = columns.some((c) => c.fieldKey === 'destination')
  const hasRoute = columns.some((c) => c.fieldKey === 'route')
  if (!hasDeparture && !hasDestination) return ''

  const lines = [
    'From/departure: one airport code only.',
    'To/destination: final airport code only.',
  ]
  if (hasRoute) {
    lines.push('Route: intermediate stops only.')
  }
  return lines.join(' ')
}

function buildColumnList(columns: DigifiTemplateColumn[], pageSide: 'left' | 'right', layout: string, splitIndex: number): DigifiTemplateColumn[] {
  const sorted = [...columns].sort((a, b) => a.order - b.order)
  if (layout !== 'two-page') return sorted
  if (pageSide === 'left') return sorted.slice(0, splitIndex)
  return sorted.slice(splitIndex)
}

const TSV_FORMAT_RULES = `Output format (strict):
- Plain text only. No JSON, no markdown, no code fences, no headers.
- One line per non-empty cell: rowIndex<TAB>columnId<TAB>value
- Use the exact columnId strings listed below.
- Flight times as decimal hours (1.5 not 1:30).
- Dates as written on the paper.`

function buildPrompt(
  meta: DigifiScanMetaInput,
  targetColumns: DigifiTemplateColumn[],
  options: {
    includeRowBands: boolean
    chunkImages: Array<{ rowStart: number; rowEnd: number }>
    focusRows?: number[]
  }
): string {
  const colLines = targetColumns
    .map((c) => `${c.id} (${c.label}, ${columnTypeHint(c.fieldKey)})`)
    .join('; ')

  const airportRules = buildAirportPromptRules(targetColumns)

  const pageDesc =
    meta.layout === 'two-page'
      ? meta.pageSide === 'left'
        ? 'LEFT page of a two-page spread.'
        : 'RIGHT page of a two-page spread.'
      : meta.pageSide === 'left'
        ? 'LEFT paper page.'
        : 'RIGHT paper page.'

  const bandHint =
    options.includeRowBands && options.chunkImages.length > 0
      ? `Additional images are zoomed row bands for rows ${options.chunkImages.map((c) => `${c.rowStart}-${c.rowEnd}`).join(', ')}. Prefer band images for handwriting.`
      : 'Use the attached page image only.'

  if (options.focusRows?.length) {
    const focusList = options.focusRows.join(', ')
    return `Transcribe pilot logbook cells for rowIndex only: ${focusList}.
${pageDesc}
${bandHint}

${TSV_FORMAT_RULES}

Columns (columnId):
${colLines}
${airportRules ? `Airports: ${airportRules}` : ''}`
  }

  return `Transcribe this pilot logbook page.
${pageDesc}
${bandHint}

Extract rowIndex 0 through ${meta.rowCount - 1} (top to bottom). Include every row that has readable handwriting.

${TSV_FORMAT_RULES}

Columns (columnId):
${colLines}
${airportRules ? `Airports: ${airportRules}` : ''}`
}

function mergeRowsByIndex(rows: DigifiScanRow[]): { rows: DigifiScanRow[]; duplicateRowIndices: number[] } {
  const rowMap = new Map<number, DigifiScanRow>()
  const duplicateRowIndices = new Set<number>()

  for (const row of rows) {
    const existing = rowMap.get(row.rowIndex)
    if (!existing) {
      rowMap.set(row.rowIndex, {
        rowIndex: row.rowIndex,
        cells: { ...row.cells },
        tags: row.tags?.map((tag) => tag.trim()).filter(Boolean),
      })
      continue
    }

    duplicateRowIndices.add(row.rowIndex)
    for (const [columnId, value] of Object.entries(row.cells)) {
      const nextValue = (value ?? '').trim()
      if (!nextValue) continue
      if (!(existing.cells[columnId] ?? '').trim()) {
        existing.cells[columnId] = nextValue
      }
    }
    if (row.tags?.length) {
      existing.tags = Array.from(
        new Set([...(existing.tags ?? []), ...row.tags.map((tag) => tag.trim()).filter(Boolean)])
      )
    }
  }

  return {
    rows: [...rowMap.values()].sort((a, b) => a.rowIndex - b.rowIndex),
    duplicateRowIndices: [...duplicateRowIndices].sort((a, b) => a - b),
  }
}

function mergePrimaryAndRescueRows(
  primaryRows: DigifiScanRow[],
  rescueRows: DigifiScanRow[]
): DigifiScanRow[] {
  const rowMap = new Map<number, DigifiScanRow>(
    primaryRows.map((row) => [
      row.rowIndex,
      {
        rowIndex: row.rowIndex,
        cells: { ...row.cells },
        tags: row.tags ? [...row.tags] : [],
      },
    ])
  )

  for (const rescueRow of rescueRows) {
    const existing = rowMap.get(rescueRow.rowIndex)
    if (!existing) {
      rowMap.set(rescueRow.rowIndex, {
        rowIndex: rescueRow.rowIndex,
        cells: { ...rescueRow.cells },
        tags: rescueRow.tags ? [...rescueRow.tags] : [],
      })
      continue
    }
    for (const [columnId, value] of Object.entries(rescueRow.cells)) {
      const nextValue = (value ?? '').trim()
      if (!nextValue) continue
      if (!(existing.cells[columnId] ?? '').trim()) {
        existing.cells[columnId] = nextValue
      }
    }
    if (rescueRow.tags?.length) {
      existing.tags = Array.from(
        new Set([...(existing.tags ?? []), ...rescueRow.tags.map((tag) => tag.trim()).filter(Boolean)])
      )
    }
  }

  return [...rowMap.values()].sort((a, b) => a.rowIndex - b.rowIndex)
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
  callStats?: DigifiGeminiCallStats
): Promise<DigifiScanRow[]> {
  const env = getDigifiEnv()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: prompt },
    { text: 'Logbook page image:' },
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

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: generation.maxOutputTokens,
      mediaResolution: generation.mediaResolution,
      thinkingConfig,
    },
  }

  let lastError: DigifiGeminiError | null = null
  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      if (callStats) callStats.generateContentRequests += 1
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
      lastError = new DigifiGeminiError(
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
      lastError = new DigifiGeminiError(
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
      throw new DigifiGeminiError(
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
      throw new DigifiGeminiError(
        'Gemini response was truncated',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }

    try {
      const rows = parseDigifiTsvResponse(text, allowedColumnIds, maxRowCount, focusRows)
      if (rows.length === 0 && finishReason !== 'STOP') {
        throw new Error('no rows parsed')
      }
      if (!focusRows && isScanResponseIncomplete(rows, maxRowCount)) {
        throw new Error('too few rows parsed')
      }
      return rows
    } catch (error) {
      if (error instanceof DigifiGeminiError) throw error
      console.warn(
        `[digifi] invalid TSV from ${model}: ${text.length} chars, finishReason=${finishReason ?? 'unknown'}, tail=${JSON.stringify(text.slice(-120))}`
      )
      throw new DigifiGeminiError(
        finishReason === 'MAX_TOKENS'
          ? 'Gemini response was truncated'
          : 'Gemini returned unparseable text',
        'INVALID_RESPONSE',
        [...modelsAttempted, model]
      )
    }
  }

  throw lastError ?? new DigifiGeminiError('Gemini request failed', 'UNKNOWN', modelsAttempted)
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
  options?: { allowFallbackOnInvalidResponse?: boolean; callStats?: DigifiGeminiCallStats }
): Promise<{ rows: DigifiScanRow[]; modelUsed: string }> {
  const attempted: string[] = []
  let lastCapacityError: DigifiGeminiError | null = null

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
      if (!(error instanceof DigifiGeminiError)) {
        throw error
      }
      if (error.code === 'INVALID_RESPONSE' && options?.allowFallbackOnInvalidResponse === false) {
        throw new DigifiGeminiError(error.message, error.code, attempted)
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
      throw new DigifiGeminiError(error.message, error.code, attempted)
    }
  }

  throw (
    lastCapacityError ??
    new DigifiGeminiError('Gemini request failed', 'UNKNOWN', attempted)
  )
}

async function prepareGeminiImage(base64: string, mimeType: string): Promise<DigifiImagePart> {
  const compressed = await compressDigifiImageForGemini(Buffer.from(base64, 'base64'), mimeType)
  return {
    label: 'Logbook page image',
    imageBase64: compressed.base64,
    mimeType: compressed.mimeType,
  }
}

export async function scanLogbookImageWithGemini(
  options: ScanLogbookImageWithGeminiOptions
): Promise<{
  rows: DigifiScanRow[]
  modelUsed: string
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
  duplicateRowIndices: number[]
  fallbackUsed: boolean
  modelsAttempted: string[]
  geminiApiCallCount: number
  timings: DigifiScanTimings
}> {
  const startedAt = Date.now()
  const env = getDigifiEnv()
  if (!env.geminiApiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }

  const { imageBase64, mimeType, meta, chunkImages = [] } = options
  const splitIndex = Math.min(
    Math.max(1, meta.twoPageSplitIndex),
    Math.max(1, meta.columns.length - 1)
  )
  const targetColumns = buildColumnList(meta.columns, meta.pageSide, meta.layout, splitIndex)
  const allowedColumnIds = new Set(targetColumns.map((column) => column.id))
  const modelChain = getDigifiModelChain()
  const sendRowBands = chunkImages.length > 0 && !env.disableRowBandsToGemini
  const strategyUsed: DigifiScanStrategy = sendRowBands ? 'page-overview+row-bands' : 'page-overview'
  const thinkingLevel = resolveDigifiThinkingLevel(env.geminiThinkingLevel)
  const callStats: DigifiGeminiCallStats = { generateContentRequests: 0 }
  const generation: DigifiGeminiGenerationOptions = {
    maxOutputTokens: computeDigifiMaxOutputTokens(
      meta.rowCount,
      targetColumns.length,
      env.geminiMaxOutputTokensCap
    ),
    mediaResolution: resolveDigifiMediaResolution(env.geminiMediaResolution),
    thinkingLevel,
  }

  const overviewImage = await prepareGeminiImage(imageBase64, mimeType)
  const labeledChunks = sendRowBands
    ? await Promise.all(
        chunkImages.map(async (chunk) => {
          const compressed = await compressDigifiImageForGemini(
            Buffer.from(chunk.imageBase64, 'base64'),
            chunk.mimeType
          )
          return {
            label: `Row band rows ${chunk.rowStart}-${chunk.rowEnd}:`,
            imageBase64: compressed.base64,
            mimeType: compressed.mimeType,
            rowStart: chunk.rowStart,
            rowEnd: chunk.rowEnd,
          }
        })
      )
    : []

  const apiChunks: DigifiImagePart[] = labeledChunks.map((chunk) => ({
    label: chunk.label,
    imageBase64: chunk.imageBase64,
    mimeType: chunk.mimeType,
  }))

  let modelUsed = modelChain[0]
  let fallbackUsed = false
  const modelsAttempted = new Set<string>()
  let rescueAttempted = false
  let rescueRecoveredCount = 0
  let primaryMs = 0
  let rescueMs = 0
  let finalRows: DigifiScanRow[] = []
  let duplicateRowIndices = new Set<number>()

  const buildScanPrompt = (focusRows?: number[]) =>
    buildPrompt(meta, targetColumns, {
      includeRowBands: sendRowBands,
      chunkImages: labeledChunks,
      focusRows,
    })

  const runModelChainFallback = async () => {
    if (!env.enableCapacityModelFallback) {
      console.warn('[digifi] capacity model fallback disabled — keeping primary scan result')
      return
    }
    const fallbackModels = modelChain.slice(1)
    if (fallbackModels.length === 0) {
      console.warn('[digifi] skipping model fallback — no alternate models after primary')
      return
    }
    console.warn(
      `[digifi] gemini-3.5-flash unavailable, trying ${fallbackModels.join(' → ')}`
    )
    rescueAttempted = true
    const rescueStartedAt = Date.now()
    const fallbackResult = await callGeminiRows(
      fallbackModels,
      buildScanPrompt(),
      overviewImage,
      apiChunks,
      allowedColumnIds,
      meta.rowCount,
      undefined,
      generation,
      { callStats }
    )
    modelUsed = fallbackResult.modelUsed
    modelsAttempted.add(fallbackResult.modelUsed)
    fallbackUsed = fallbackResult.modelUsed !== modelChain[0]
    const fallbackMerged = mergeRowsByIndex(fallbackResult.rows)
    finalRows = fallbackMerged.rows
    duplicateRowIndices = new Set(fallbackMerged.duplicateRowIndices)
    rescueMs += Date.now() - rescueStartedAt
  }

  const primaryStartedAt = Date.now()
  try {
    const primaryResult = await callGeminiRows(
      [modelChain[0]],
      buildScanPrompt(),
      overviewImage,
      apiChunks,
      allowedColumnIds,
      meta.rowCount,
      undefined,
      generation,
      { allowFallbackOnInvalidResponse: false, callStats }
    )
    modelUsed = primaryResult.modelUsed
    modelsAttempted.add(primaryResult.modelUsed)
    const primaryMerged = mergeRowsByIndex(primaryResult.rows)
    finalRows = primaryMerged.rows
    duplicateRowIndices = new Set(primaryMerged.duplicateRowIndices)
    if (isScanResponseIncomplete(finalRows, meta.rowCount)) {
      console.warn(
        `[digifi] primary scan incomplete (${countRowsWithCells(finalRows)}/${meta.rowCount} rows); not retrying with alternate model`
      )
    }
  } catch (error) {
    if (!(error instanceof DigifiGeminiError)) {
      throw error
    }
    if (shouldTryNextDigifiModel(error.code)) {
      await runModelChainFallback()
    } else {
      throw error
    }
  } finally {
    primaryMs = Date.now() - primaryStartedAt
  }

  const primaryDiagnostics = analyzeDigifiScanRows(finalRows, meta.rowCount)
  if (env.enableRescueScan && primaryDiagnostics.missingRowIndices.length > 0) {
    rescueAttempted = true
    const focusRows = primaryDiagnostics.missingRowIndices
    const rescueStartedAt = Date.now()
    const rescueResult = await callGeminiRows(
      [modelChain[0]],
      buildScanPrompt(focusRows),
      overviewImage,
      sendRowBands
        ? labeledChunks
            .filter((chunk) =>
              focusRows.some((row) => row >= chunk.rowStart && row <= chunk.rowEnd)
            )
            .map((chunk) => ({
              label: chunk.label,
              imageBase64: chunk.imageBase64,
              mimeType: chunk.mimeType,
            }))
        : [],
      allowedColumnIds,
      meta.rowCount,
      new Set(focusRows),
      generation,
      { callStats }
    )
    modelsAttempted.add(rescueResult.modelUsed)
    if (rescueResult.modelUsed !== modelChain[0]) fallbackUsed = true
    if (rescueResult.modelUsed !== modelUsed) {
      console.info(
        `[digifi] rescue scan used ${rescueResult.modelUsed} (primary used ${modelUsed})`
      )
    }
    const rescueMerged = mergeRowsByIndex(rescueResult.rows)
    finalRows = mergePrimaryAndRescueRows(finalRows, rescueMerged.rows)
    for (const rowIndex of rescueMerged.duplicateRowIndices) {
      duplicateRowIndices.add(rowIndex)
    }
    const finalDiagnostics = analyzeDigifiScanRows(finalRows, meta.rowCount)
    rescueRecoveredCount = focusRows.filter(
      (rowIndex) => !finalDiagnostics.missingRowIndices.includes(rowIndex)
    ).length
    rescueMs += Date.now() - rescueStartedAt
  } else if (primaryDiagnostics.missingRowIndices.length > 0) {
    console.warn(
      `[digifi] ${primaryDiagnostics.missingRowIndices.length} missing row(s); rescue scan disabled (one API call per page)`
    )
  }

  const geminiApiCallCount = callStats.generateContentRequests
  console.info('[digifi] gemini generateContent calls this page:', geminiApiCallCount, {
    models: [...modelsAttempted],
    thinkingLevel,
    maxOutputTokens: generation.maxOutputTokens,
  })

  const timings: DigifiScanTimings = {
    primaryMs,
    rescueMs,
    totalMs: Date.now() - startedAt,
  }

  return {
    rows: finalRows,
    modelUsed,
    strategyUsed,
    chunkCount: chunkImages.length,
    rescueAttempted,
    rescueRecoveredCount,
    duplicateRowIndices: [...duplicateRowIndices].sort((a, b) => a - b),
    fallbackUsed,
    modelsAttempted: [...modelsAttempted],
    geminiApiCallCount,
    timings,
  }
}
