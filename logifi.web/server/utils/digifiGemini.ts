import {
  GEMINI_SCAN_RESPONSE_JSON_SCHEMA,
  geminiScanResponseSchema,
  type DigifiScanMetaInput,
} from './digifiSchema'
import { DigifiGeminiError, getDigifiModelChain } from './digifiEnv'
import { getDigifiEnv } from './digifiEnv'

export { DigifiGeminiError } from './digifiEnv'
export type { DigifiGeminiErrorCode } from './digifiEnv'

const GEMINI_RETRY_DELAYS_MS = [2000, 5000, 10000]
/** Full logbook pages with many rows/columns need a large JSON payload; default caps often truncate. */
const GEMINI_MAX_OUTPUT_TOKENS = 65_536

/** Parse model text as JSON; strips optional markdown fences some models still emit. */
export function parseGeminiJsonText(text: string): unknown {
  let trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) {
    trimmed = fenced[1].trim()
  }
  return JSON.parse(trimmed)
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
import {
  APPROACH_TYPE_OPTIONS,
  CATEGORY_CLASS_OPTIONS,
  PILOT_ROLE_OPTIONS,
  ROLE_OPTIONS,
} from '../../app/utils/logbookBuilderTypes'
import { analyzeDigifiScanRows } from '../../app/utils/digifiScanDiagnostics'
import type { DigifiScanStrategy, DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import type { LogbookColumnKey } from '../../app/utils/logbookTypes'

interface DigifiImagePart {
  label: string
  imageBase64: string
  mimeType: string
}

interface DigifiScanRowResult {
  rowIndex: number
  cells: Record<string, string>
  tags?: string[]
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

function columnTypeHint(fieldKey: LogbookColumnKey | null): string {
  if (!fieldKey) return 'text'
  if (fieldKey === 'date') return 'date (MM/DD, MM/DD/YY, or YYYY-MM-DD as written)'
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
    return 'decimal flight time or count (e.g. 1.2)'
  }
  if (fieldKey === 'role') return `select one of: ${ROLE_OPTIONS.map((r) => r.value).join(', ')}`
  if (fieldKey === 'approachType') return `select one of: ${APPROACH_TYPE_OPTIONS.join(', ')}`
  if (fieldKey === 'categoryClass') return `select one of: ${CATEGORY_CLASS_OPTIONS.join(', ')}`
  if (fieldKey === 'pilotRole') return `select one of: ${PILOT_ROLE_OPTIONS.filter((p) => p.value).map((p) => p.value).join(', ')}`
  if (fieldKey === 'departure' || fieldKey === 'destination') {
    return 'single departure or final destination airport code only (3-4 letters, one code)'
  }
  if (fieldKey === 'route') return 'intermediate stops only (one or more 3-4 letter codes, space-separated)'
  return 'text'
}

function buildAirportPromptRules(columns: DigifiTemplateColumn[]): string {
  const hasDeparture = columns.some((c) => c.fieldKey === 'departure')
  const hasDestination = columns.some((c) => c.fieldKey === 'destination')
  const hasRoute = columns.some((c) => c.fieldKey === 'route')
  if (!hasDeparture && !hasDestination) return ''

  const lines = [
    '- Airports: put only ONE airport code in the From/departure column (first airport of the trip).',
    '- Put only ONE airport code in the To/destination column (final airport where the flight ended).',
  ]
  if (hasRoute) {
    lines.push('- Put intermediate stops in the Route column only (not duplicated in From/To).')
  } else {
    lines.push('- Do not combine multiple airport codes in a single From or To cell.')
  }
  lines.push(
    '- Example round trip KLAF-KFKR-KLAF on paper:' +
      (hasRoute ? ' From KLAF, Route KFKR, To KLAF' : ' From KLAF, To KLAF') +
      ' (not To "KFKR KLAF" and do not put the origin in Route).'
  )
  return lines.join('\n')
}

function buildColumnList(columns: DigifiTemplateColumn[], pageSide: 'left' | 'right', layout: string, splitIndex: number): DigifiTemplateColumn[] {
  const sorted = [...columns].sort((a, b) => a.order - b.order)
  if (layout !== 'two-page') return sorted
  if (pageSide === 'left') return sorted.slice(0, splitIndex)
  return sorted.slice(splitIndex)
}

function buildPrompt(
  meta: DigifiScanMetaInput,
  targetColumns: DigifiTemplateColumn[],
  options: {
    chunkImages: Array<{ rowStart: number; rowEnd: number }>
    focusRows?: number[]
  }
): string {
  const colLines = targetColumns
    .map(
      (c) =>
        `- columnId "${c.id}": label "${c.label}" -> field ${c.fieldKey ?? 'unmapped'} (${columnTypeHint(c.fieldKey)})`
    )
    .join('\n')
  const airportRules = buildAirportPromptRules(targetColumns)

  const pageDesc =
    meta.layout === 'two-page'
      ? meta.pageSide === 'left'
        ? 'LEFT page of an open logbook spread (columns on the left side of the spread only).'
        : 'RIGHT page of an open logbook spread (columns on the right side of the spread only).'
      : meta.pageSide === 'left'
        ? 'LEFT paper page; extract rows starting at row index 0.'
        : 'RIGHT paper page; extract rows starting at row index 0 (these map to the next rows in the grid after the left page was scanned).'

  const chunkLines = options.chunkImages.length > 0
    ? options.chunkImages
        .map((chunk) => `- Attached zoomed row-band image covers rowIndex ${chunk.rowStart} through ${chunk.rowEnd}.`)
        .join('\n')
    : '- No zoomed row-band images were attached; rely on the overview page image only.'

  if (options.focusRows?.length) {
    const focusList = options.focusRows.join(', ')
    return `You are transcribing specific missing pilot logbook rows into structured data.

${pageDesc}

The first attached image is the full-page overview. Additional images are zoomed row-band crops.
${chunkLines}

Only return these rowIndex values: ${focusList}.
Return exactly one row object for each requested rowIndex. Do not return any other rowIndex values.

Rules:
- Use the zoomed row-band images as the primary source for handwriting.
- Use empty string "" only if a cell is blank or completely illegible; otherwise make your best guess.
- Match handwriting to the column labels listed below.
- Flight times as decimal hours (e.g. 1.5 not 1:30).
- Dates as written on the paper.
${airportRules ? `${airportRules}\n` : ''}- Return ONLY valid JSON matching the schema.

Columns to extract on this page:
${colLines}
`
  }

  return `You are transcribing a pilot paper logbook page into structured data.

${pageDesc}

The first attached image is the full-page overview. Additional images are zoomed row-band crops.
${chunkLines}

Extract exactly ${meta.rowCount} physical row lines on this page (rowIndex 0 through ${meta.rowCount - 1}, top to bottom).
Return one row object for every line position - do not skip rows even if handwriting is faint.

Rules:
- Use the zoomed row-band images as the primary source for handwriting and the overview image for context.
- rowIndex must be contiguous from 0 upward with no gaps.
- If the same row appears in multiple row-band images, merge the best reading into a single row object.
- Use empty string "" only if a cell is blank or completely illegible; otherwise make your best guess.
- Do not stop early: include all ${meta.rowCount} rows.
- Match handwriting to the column labels listed below.
- Flight times as decimal hours (e.g. 1.5 not 1:30).
- Dates as written on the paper.
${airportRules ? `${airportRules}\n` : ''}- Return ONLY valid JSON matching the schema.

Columns to extract on this page:
${colLines}
`
}

function mapValidatedRows(
  validatedRows: Array<{ rowIndex: number; cells: Array<{ columnId: string; value: string }>; tags?: string[] }>,
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows?: Set<number>
): DigifiScanRowResult[] {
  return validatedRows
    .filter((row) => row.rowIndex >= 0 && row.rowIndex < maxRowCount)
    .filter((row) => !focusRows || focusRows.has(row.rowIndex))
    .map((row) => {
      const cells: Record<string, string> = {}
      for (const cell of row.cells) {
        if (allowedColumnIds.has(cell.columnId)) {
          cells[cell.columnId] = cell.value ?? ''
        }
      }
      return {
        rowIndex: row.rowIndex,
        cells,
        tags: row.tags,
      }
    })
}

function mergeRowsByIndex(rows: DigifiScanRowResult[]): { rows: DigifiScanRowResult[]; duplicateRowIndices: number[] } {
  const rowMap = new Map<number, DigifiScanRowResult>()
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
  primaryRows: DigifiScanRowResult[],
  rescueRows: DigifiScanRowResult[]
): DigifiScanRowResult[] {
  const rowMap = new Map<number, DigifiScanRowResult>(
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
  modelsAttempted: string[]
): Promise<unknown> {
  const env = getDigifiEnv()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: prompt },
    { text: 'Full-page overview image:' },
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

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_SCAN_RESPONSE_JSON_SCHEMA,
    },
  }

  let lastError: DigifiGeminiError | null = null
  for (let attempt = 0; attempt < GEMINI_RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const code = isCapacityHttpStatus(res.status) ? 'CAPACITY' : 'UNKNOWN'
      lastError = new DigifiGeminiError(
        `Gemini API ${res.status}: ${errText.slice(0, 200)}`,
        code,
        [...modelsAttempted, model]
      )
      if (isRetryableHttpStatus(res.status) && attempt < GEMINI_RETRY_DELAYS_MS.length - 1) {
        await sleep(GEMINI_RETRY_DELAYS_MS[attempt])
        continue
      }
      throw lastError
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
        finishReason?: string
      }>
      usageMetadata?: { totalTokenCount?: number }
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

    const tokenCount = data.usageMetadata?.totalTokenCount
    if (tokenCount != null) {
      console.info('[digifi] scan tokens:', tokenCount, 'model:', model)
    }

    const finishReason = candidate?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      console.warn(
        `[digifi] model ${model} hit output token limit (${text.length} chars); response likely truncated`
      )
    }

    try {
      return parseGeminiJsonText(text)
    } catch {
      console.warn(
        `[digifi] invalid JSON from ${model}: ${text.length} chars, finishReason=${finishReason ?? 'unknown'}, tail=${JSON.stringify(text.slice(-120))}`
      )
      throw new DigifiGeminiError(
        finishReason === 'MAX_TOKENS'
          ? 'Gemini response was truncated'
          : 'Gemini returned invalid JSON',
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
  chunkImages: DigifiImagePart[]
): Promise<{ data: unknown; modelUsed: string }> {
  const attempted: string[] = []
  let lastCapacityError: DigifiGeminiError | null = null

  for (const model of models) {
    attempted.push(model)
    try {
      const data = await callGeminiRowsOnModel(
        model,
        prompt,
        overviewImage,
        chunkImages,
        attempted.slice(0, -1)
      )
      if (attempted.length > 1) {
        console.info(
          `[digifi] scan succeeded with fallback model ${model} (tried: ${attempted.join(' → ')})`
        )
      }
      return { data, modelUsed: model }
    } catch (error) {
      if (!(error instanceof DigifiGeminiError)) {
        throw error
      }
      const isLastModel = model === models[models.length - 1]
      if ((error.code === 'CAPACITY' || error.code === 'INVALID_RESPONSE') && !isLastModel) {
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

export async function scanLogbookImageWithGemini(
  options: ScanLogbookImageWithGeminiOptions
): Promise<{
  rows: DigifiScanRowResult[]
  modelUsed: string
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
  duplicateRowIndices: number[]
}> {
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
  const modelChain = getDigifiModelChain(Boolean(meta.useProModel))
  const strategyUsed: DigifiScanStrategy = chunkImages.length > 0 ? 'page-overview+row-bands' : 'page-overview'
  const overviewImage: DigifiImagePart = {
    label: 'Full-page overview image',
    imageBase64,
    mimeType,
  }
  const labeledChunks = chunkImages.map((chunk) => ({
    label: `Zoomed row-band image for rowIndex ${chunk.rowStart} through ${chunk.rowEnd}:`,
    imageBase64: chunk.imageBase64,
    mimeType: chunk.mimeType,
    rowStart: chunk.rowStart,
    rowEnd: chunk.rowEnd,
  }))

  const primaryPrompt = buildPrompt(meta, targetColumns, {
    chunkImages: labeledChunks,
  })
  const primaryResult = await callGeminiRows(modelChain, primaryPrompt, overviewImage, labeledChunks)
  const primaryParsed = primaryResult.data
  let modelUsed = primaryResult.modelUsed
  const primaryValidated = geminiScanResponseSchema.parse(primaryParsed)
  const primaryMappedRows = mapValidatedRows(primaryValidated.rows, allowedColumnIds, meta.rowCount)
  const primaryMerged = mergeRowsByIndex(primaryMappedRows)
  let finalRows = primaryMerged.rows
  let duplicateRowIndices = new Set(primaryMerged.duplicateRowIndices)
  let rescueAttempted = false
  let rescueRecoveredCount = 0

  const primaryDiagnostics = analyzeDigifiScanRows(finalRows, meta.rowCount)
  if (labeledChunks.length > 0 && primaryDiagnostics.missingRowIndices.length > 0) {
    rescueAttempted = true
    const focusRows = primaryDiagnostics.missingRowIndices
    const rescueChunks = labeledChunks.filter((chunk) =>
      focusRows.some((rowIndex) => rowIndex >= chunk.rowStart && rowIndex <= chunk.rowEnd)
    )
    if (rescueChunks.length > 0) {
      const rescuePrompt = buildPrompt(meta, targetColumns, {
        chunkImages: rescueChunks,
        focusRows,
      })
      const rescueResult = await callGeminiRows(modelChain, rescuePrompt, overviewImage, rescueChunks)
      const rescueParsed = rescueResult.data
      if (rescueResult.modelUsed !== modelUsed) {
        console.info(
          `[digifi] rescue scan used ${rescueResult.modelUsed} (primary used ${modelUsed})`
        )
      }
      const rescueValidated = geminiScanResponseSchema.parse(rescueParsed)
      const rescueMappedRows = mapValidatedRows(
        rescueValidated.rows,
        allowedColumnIds,
        meta.rowCount,
        new Set(focusRows)
      )
      const rescueMerged = mergeRowsByIndex(rescueMappedRows)
      finalRows = mergePrimaryAndRescueRows(finalRows, rescueMerged.rows)
      for (const rowIndex of rescueMerged.duplicateRowIndices) {
        duplicateRowIndices.add(rowIndex)
      }
      const finalDiagnostics = analyzeDigifiScanRows(finalRows, meta.rowCount)
      rescueRecoveredCount = focusRows.filter(
        (rowIndex) => !finalDiagnostics.missingRowIndices.includes(rowIndex)
      ).length
    }
  }

  return {
    rows: finalRows,
    modelUsed,
    strategyUsed,
    chunkCount: labeledChunks.length,
    rescueAttempted,
    rescueRecoveredCount,
    duplicateRowIndices: [...duplicateRowIndices].sort((a, b) => a - b),
  }
}
