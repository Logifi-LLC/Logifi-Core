import {
  APPROACH_TYPE_OPTIONS,
  CATEGORY_CLASS_OPTIONS,
  isDigifiManualOnlyField,
} from '../../app/utils/logbookBuilderTypes'
import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import type { DigifiScanMetaInput } from './digifiSchema'
import { DIGIFI_COMMON_MISTAKE_PROMPT_RULES } from '../../app/utils/digifiCommonMistakes'
import { formatFewShotPromptBlock, type DigifiFewShotPair } from '../../app/utils/digifiFewShot'
import {
  formatSessionContextPromptBlock,
  type DigifiSessionPriorPage,
} from './digifiSessionContext'

function columnTypeHint(column: DigifiTemplateColumn): string {
  if (column.columnKind === 'day') {
    return 'decimal time (daytime hours; not Night and not day landings)'
  }
  if (column.columnKind === 'custom') {
    return 'custom column; checkmark, X, or decimal time in this column only — do not merge into neighboring columns'
  }
  const fieldKey = column.fieldKey
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
  if (fieldKey === 'approachType') return APPROACH_TYPE_OPTIONS.join('|')
  if (fieldKey === 'categoryClass') return CATEGORY_CLASS_OPTIONS.join('|')
  if (fieldKey === 'remarks') {
    return 'free text; stacked lines in one remarks box = one cell — join lines with " | " in the value (never the characters backslash-n); not separate rows/columns; keep person names and lesson notes in this cell'
  }
  if (fieldKey === 'pilots') {
    return 'leave empty; do not copy names or lesson notes out of remarks'
  }
  if (fieldKey === 'departure' || fieldKey === 'destination') return 'airport code'
  if (fieldKey === 'route') return 'route codes'
  return 'text'
}

function neighborLabel(column: DigifiTemplateColumn | undefined, edge: string): string {
  const label = column?.label?.trim()
  return label || edge
}

/** Custom paper columns in page order, with the columns on either side. */
export function formatCustomColumnPromptBlock(columns: DigifiTemplateColumn[]): string {
  const custom = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.columnKind === 'custom' && column.label.trim())
  if (custom.length === 0) return ''
  const lines = custom.map(({ column, index }, position) => {
    const left = neighborLabel(columns[index - 1], 'the left edge')
    const right = neighborLabel(columns[index + 1], 'the right edge')
    const title = column.label.trim().replace(/"/g, "'")
    return `${position + 1}. "${title}" (columnId ${column.id}) sits between "${left}" and "${right}". Read only the ink in this column. Do not mix it into ${left} or ${right}.`
  })
  return `Custom columns (in this order — each title is its own column; do not mix it into a neighbor such as ASEL):\n${lines.join('\n')}`
}

export function formatDayColumnPromptBlock(columns: DigifiTemplateColumn[]): string {
  const day = columns.find((column) => column.columnKind === 'day')
  if (!day) return ''
  const title = (day.label.trim() || 'Day').replace(/"/g, "'")
  return `Day time: columnId ${day.id} ("${title}") is daytime flight hours as a decimal. It is not Night and not Day Landings. Transcribe only that column into this columnId.`
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

export function buildColumnList(
  columns: DigifiTemplateColumn[],
  pageSide: 'left' | 'right',
  layout: string,
  splitIndex: number
): DigifiTemplateColumn[] {
  const sorted = [...columns].sort((a, b) => a.order - b.order)
  if (layout !== 'two-page') return sorted
  if (pageSide === 'left') return sorted.slice(0, splitIndex)
  return sorted.slice(splitIndex)
}

/** Columns the vision model may transcribe (Role / Pilot Role are manual-only). */
export function filterDigifiScanColumns(columns: DigifiTemplateColumn[]): DigifiTemplateColumn[] {
  return columns.filter((col) => !isDigifiManualOnlyField(col.fieldKey))
}

export function buildTargetColumns(meta: DigifiScanMetaInput): DigifiTemplateColumn[] {
  const splitIndex = Math.min(
    Math.max(1, meta.twoPageSplitIndex),
    Math.max(1, meta.columns.length - 1)
  )
  return filterDigifiScanColumns(
    buildColumnList(meta.columns, meta.pageSide, meta.layout, splitIndex)
  )
}

export const TSV_FORMAT_RULES = `Output format (strict):
- Plain text only. No JSON, no markdown, no code fences, no headers.
- One line per non-empty cell: rowIndex<TAB>columnId<TAB>value
- Use the exact columnId strings listed below.
- Flight times as decimal hours (1.5 not 1:30).
- Dates as written on the paper.
- Do not transcribe page footer totals, "brought forward", "carried forward", or other summary-only rows unless they are individual flight lines with a date or aircraft.
- If the last rowIndex is only cumulative totals (no date, aircraft, or route), leave that rowIndex empty.
- Do not create extra rowIndex values or columnId values for sub-lines inside a single remarks box.`

const TOTALS_FOOTER_RULES = `Totals and footer rows (critical):
- Never assign a rowIndex to the bottom summary row labeled or resembling: Total, Totals, Brought Forward, Carried Forward, Amount Forward, or Page Total.
- That row has large cumulative hours across many columns and no individual flight date or aircraft — leave every rowIndex empty for it.
- rowCount is flight lines only; do not use an extra rowIndex for the totals strip at the bottom of the page.`

const REMARKS_ROW_RULES = `Remarks (critical):
- Each rowIndex is exactly one physical flight line on the paper, bounded by horizontal ruled lines above and below.
- Join with " | " only for multiple handwritten lines inside the same remarks box on the same flight line.
- Never merge remarks from two different flight lines into one rowIndex.
- Adjacent rows with the same total or PIC time (e.g. three 1.3 lines in a row) are still separate rowIndex values — do not join their remarks with " | " or skip a rowIndex.
- Remarks ink below the ruled line under row N belongs to row N+1, not row N.
- If handwriting crosses a ruled line, split at the line — never assign both sides to one rowIndex.
- Transcribe only ink inside the remarks box for that row (not time or landing columns in the same band).
- Keep every word of that remarks box in the remarks cell, including person names and lesson notes. Do not move any of it into Pilots or any other column.
- Never put totals, footer, or carry-forward text into a remarks cell.`

export function targetColumnsIncludeRemarks(columns: DigifiTemplateColumn[]): boolean {
  return columns.some((column) => column.fieldKey === 'remarks')
}

export function buildRowBandLabel(
  rowStart: number,
  rowEnd: number,
  hasRemarksFocus: boolean
): string {
  if (hasRemarksFocus) {
    return `Row band rows ${rowStart}-${rowEnd} (remarks only — stop at ruled line below each row):`
  }
  return `Row band rows ${rowStart}-${rowEnd}:`
}

export function buildPageSpecificRules(
  meta: DigifiScanMetaInput,
  targetColumns: DigifiTemplateColumn[]
): string {
  const parts = [TOTALS_FOOTER_RULES, REMARKS_ROW_RULES]

  if (meta.layout === 'two-page' && meta.pageSide === 'right') {
    const columnIds = targetColumns.map((c) => c.id).join(', ')
    parts.push(
      `Two-page RIGHT page:
- Transcribe only these columnIds on the right half: ${columnIds}.
- rowIndex 0 through ${meta.rowCount - 1} must align with the same physical flight lines as the left page (first flight line = rowIndex 0).
- Do not invent date or aircraft values — those columns are not on this page.
- The bottom totals row may appear in time columns only; still exclude it from all rowIndex values.`
    )
  }

  return parts.join('\n\n')
}

export const DIGIFI_SYSTEM_PROMPT = `You are an expert at transcribing handwritten pilot logbook pages into structured cell data.
Follow the output format rules exactly.`

export function buildScanPrompt(
  meta: DigifiScanMetaInput,
  targetColumns: DigifiTemplateColumn[],
  options: {
    includeRowBands: boolean
    chunkImages: Array<{ rowStart: number; rowEnd: number }>
    focusRows?: number[]
    fewShotExamples?: DigifiFewShotPair[]
    sessionPriorPages?: DigifiSessionPriorPage[]
  }
): string {
  const colLines = targetColumns
    .map((c, index) => `${index + 1}. ${c.id} (${c.label}, ${columnTypeHint(c)})`)
    .join('; ')

  const airportRules = buildAirportPromptRules(targetColumns)
  const customColumnRules = formatCustomColumnPromptBlock(targetColumns)
  const dayColumnRules = formatDayColumnPromptBlock(targetColumns)
  const pageRules = buildPageSpecificRules(meta, targetColumns)
  const mistakeRules = DIGIFI_COMMON_MISTAKE_PROMPT_RULES
  const fewShotRules = formatFewShotPromptBlock(options.fewShotExamples ?? [])
  const sessionRules = formatSessionContextPromptBlock(
    options.sessionPriorPages ?? [],
    meta.columns
  )
  const extraRules = [
    airportRules ? `Airports: ${airportRules}` : '',
    customColumnRules,
    dayColumnRules,
    pageRules,
    mistakeRules,
    sessionRules,
    fewShotRules,
  ]
    .filter(Boolean)
    .join('\n\n')

  const pageDesc =
    meta.layout === 'two-page'
      ? meta.pageSide === 'left'
        ? 'LEFT page of a two-page spread.'
        : 'RIGHT page of a two-page spread.'
      : meta.pageSide === 'left'
        ? 'LEFT paper page.'
        : 'RIGHT paper page.'

  const hasRemarksFocus = targetColumnsIncludeRemarks(targetColumns)
  const bandHint =
    options.includeRowBands && options.chunkImages.length > 0
      ? hasRemarksFocus
        ? `Additional images are zoomed row bands for rows ${options.chunkImages.map((c) => `${c.rowStart}-${c.rowEnd}`).join(', ')}. Row-band images are zoomed to the remarks column. Use horizontal ruled lines as hard row boundaries. Prefer band images for handwriting.`
        : `Additional images are zoomed row bands for rows ${options.chunkImages.map((c) => `${c.rowStart}-${c.rowEnd}`).join(', ')}. Prefer band images for handwriting.`
      : 'Use the attached page image only.'

  if (options.focusRows?.length) {
    const focusList = options.focusRows.join(', ')
    return `Transcribe pilot logbook cells for rowIndex only: ${focusList}.
${pageDesc}
${bandHint}

${TSV_FORMAT_RULES}

Columns (columnId):
${colLines}
${extraRules}`
  }

  return `Transcribe this pilot logbook page.
${pageDesc}
${bandHint}

Extract rowIndex 0 through ${meta.rowCount - 1} (top to bottom). rowIndex 0 is the first flight line below the header; rowIndex 1 is the second line, and so on.
Include every flight line that has any readable handwriting in date, aircraft, identification, or remarks — do not skip sparse or light lines.
If unsure between two physical lines, use separate rowIndex values rather than merging lines.
Identical duration values across consecutive lines (same total/PIC time) do not mean those lines are one flight — keep a distinct rowIndex for each ruled band.
Exclude footer/carry/totals summary rows from row indices.

${TSV_FORMAT_RULES}

Columns (columnId):
${colLines}
${extraRules}`
}
