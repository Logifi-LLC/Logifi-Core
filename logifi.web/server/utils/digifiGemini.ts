import {
  GEMINI_SCAN_RESPONSE_JSON_SCHEMA,
  geminiScanResponseSchema,
  type DigifiScanMetaInput,
} from './digifiSchema'
import { getDigifiEnv } from './digifiEnv'
import {
  APPROACH_TYPE_OPTIONS,
  CATEGORY_CLASS_OPTIONS,
  PILOT_ROLE_OPTIONS,
  ROLE_OPTIONS,
} from '../../app/utils/logbookBuilderTypes'
import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import type { LogbookColumnKey } from '../../app/utils/logbookTypes'

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
  if (fieldKey === 'departure' || fieldKey === 'destination') return 'airport code (3-4 letters)'
  return 'text'
}

function buildColumnList(columns: DigifiTemplateColumn[], pageSide: 'left' | 'right', layout: string, splitIndex: number): DigifiTemplateColumn[] {
  const sorted = [...columns].sort((a, b) => a.order - b.order)
  if (layout !== 'two-page') return sorted
  if (pageSide === 'left') return sorted.slice(0, splitIndex)
  return sorted.slice(splitIndex)
}

function buildPrompt(meta: DigifiScanMetaInput, targetColumns: DigifiTemplateColumn[]): string {
  const colLines = targetColumns
    .map(
      (c) =>
        `- columnId "${c.id}": label "${c.label}" → field ${c.fieldKey ?? 'unmapped'} (${columnTypeHint(c.fieldKey)})`
    )
    .join('\n')

  const pageDesc =
    meta.layout === 'two-page'
      ? meta.pageSide === 'left'
        ? 'LEFT page of an open logbook spread (columns on the left side of the spread only).'
        : 'RIGHT page of an open logbook spread (columns on the right side of the spread only).'
      : meta.pageSide === 'left'
        ? 'LEFT paper page; extract rows starting at row index 0.'
        : 'RIGHT paper page; extract rows starting at row index 0 (these map to the next rows in the grid after the left page was scanned).'

  return `You are transcribing a pilot paper logbook page into structured data.

${pageDesc}

Extract exactly ${meta.rowCount} physical row lines on this page (rowIndex 0 through ${meta.rowCount - 1}, top to bottom). Return one row object for every line position — do not skip rows even if handwriting is faint.

Rules:
- rowIndex must be contiguous from 0 upward with no gaps.
- Use empty string "" only if a cell is blank or completely illegible; otherwise make your best guess.
- Do not stop early: include all ${meta.rowCount} rows.
- Match handwriting to the column labels listed below.
- Flight times as decimal hours (e.g. 1.5 not 1:30).
- Dates as written on the paper.
- Return ONLY valid JSON matching the schema.

Columns to extract on this page:
${colLines}
`
}

export async function scanLogbookImageWithGemini(
  imageBase64: string,
  mimeType: string,
  meta: DigifiScanMetaInput
): Promise<{ rows: Array<{ rowIndex: number; cells: Record<string, string>; tags?: string[] }>; modelUsed: string }> {
  const env = getDigifiEnv()
  if (!env.geminiApiKey) {
    throw new Error('DIGIFI_NOT_CONFIGURED')
  }

  const splitIndex = Math.min(
    Math.max(1, meta.twoPageSplitIndex),
    Math.max(1, meta.columns.length - 1)
  )
  const targetColumns = buildColumnList(meta.columns, meta.pageSide, meta.layout, splitIndex)
  const allowedColumnIds = new Set(targetColumns.map((c) => c.id))

  const model = meta.useProModel ? env.proModel : env.model
  const prompt = buildPrompt(meta, targetColumns)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_SCAN_RESPONSE_JSON_SCHEMA,
    },
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      continue
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      lastError = new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`)
      if (res.status >= 500 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      throw lastError
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: { totalTokenCount?: number }
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('Gemini returned empty response')
    }

    const tokenCount = data.usageMetadata?.totalTokenCount
    if (tokenCount != null) {
      console.info('[digifi] scan tokens:', tokenCount, 'model:', model)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('Gemini returned invalid JSON')
    }

    const validated = geminiScanResponseSchema.parse(parsed)
    const rows = validated.rows
      .filter((r) => r.rowIndex >= 0 && r.rowIndex < meta.rowCount)
      .map((r) => {
        const cells: Record<string, string> = {}
        for (const cell of r.cells) {
          if (allowedColumnIds.has(cell.columnId)) {
            cells[cell.columnId] = cell.value ?? ''
          }
        }
        return {
          rowIndex: r.rowIndex,
          cells,
          tags: r.tags,
        }
      })

    return { rows, modelUsed: model }
  }

  throw lastError ?? new Error('Gemini request failed')
}
