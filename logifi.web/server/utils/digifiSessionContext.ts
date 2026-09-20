import type { DigifiPageSide, DigifiScanRow, DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import { parseDigifiScanSessionPayload } from './digifiSpreadRecovery'

/** Fields that should stay consistent across pages in one spread. */
const SESSION_BIAS_FIELD_KEYS = [
  'date',
  'aircraft',
  'identification',
  'departure',
  'destination',
  'route',
  'categoryClass',
  'role',
  'pilotRole',
] as const

const MAX_SAMPLE_ROWS_PER_PAGE = 4
const MAX_VALUE_CHARS = 40

export interface DigifiSessionPriorPage {
  pageSide: DigifiPageSide
  rows: DigifiScanRow[]
}

interface DigifiScanSessionQueryRow {
  page_side: string | null
  scan_payload: unknown
  created_at: string
}

function columnIdByFieldKey(columns: DigifiTemplateColumn[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const column of columns) {
    if (column.fieldKey) map.set(column.fieldKey, column.id)
  }
  return map
}

function trimSessionValue(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_VALUE_CHARS)
}

function formatPriorPageSampleLines(
  rows: DigifiScanRow[],
  idByField: Map<string, string>
): string[] {
  const lines: string[] = []
  const sorted = [...rows].sort((a, b) => a.rowIndex - b.rowIndex)
  for (const row of sorted) {
    if (lines.length >= MAX_SAMPLE_ROWS_PER_PAGE) break
    const parts: string[] = []
    for (const fieldKey of SESSION_BIAS_FIELD_KEYS) {
      const columnId = idByField.get(fieldKey)
      if (!columnId) continue
      const raw = row.cells[columnId]
      if (typeof raw !== 'string') continue
      const value = trimSessionValue(raw)
      if (!value) continue
      parts.push(`${fieldKey}=${value}`)
    }
    if (parts.length === 0) continue
    lines.push(`  row ${row.rowIndex}: ${parts.join(', ')}`)
  }
  return lines
}

export function formatSessionContextPromptBlock(
  priorPages: DigifiSessionPriorPage[],
  columns: DigifiTemplateColumn[]
): string {
  if (priorPages.length === 0) return ''

  const idByField = columnIdByFieldKey(columns)
  const pageBlocks: string[] = []

  for (const page of priorPages) {
    const sampleLines = formatPriorPageSampleLines(page.rows, idByField)
    if (sampleLines.length === 0) continue
    const sideLabel = page.pageSide === 'left' ? 'LEFT' : 'RIGHT'
    pageBlocks.push([`${sideLabel} page (already scanned in this spread):`, ...sampleLines].join('\n'))
  }

  if (pageBlocks.length === 0) return ''

  return [
    'Session so far (earlier pages in this spread — match aircraft IDs, airport codes, and date style when handwriting is similar; do not copy values that are not on this page):',
    ...pageBlocks,
  ].join('\n\n')
}

function pageSideSortOrder(side: DigifiPageSide): number {
  return side === 'left' ? 0 : 1
}

/**
 * Latest non-expired scan per other page side in this spread (fail open on errors).
 */
export async function loadDigifiSpreadSessionContext(
  supabase: any,
  userId: string,
  spreadId: string,
  currentPageSide: DigifiPageSide
): Promise<DigifiSessionPriorPage[]> {
  const nowIso = new Date().toISOString()

  const { data, error } = await (supabase.from('digifi_scan_sessions') as any)
    .select('page_side, scan_payload, created_at')
    .eq('user_id', userId)
    .eq('spread_id', spreadId)
    .gt('expires_at', nowIso)
    .not('scan_payload', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[digifi] session context load failed:', error.message)
    return []
  }

  const latestBySide = new Map<DigifiPageSide, DigifiSessionPriorPage>()

  for (const row of (data ?? []) as DigifiScanSessionQueryRow[]) {
    const payload = parseDigifiScanSessionPayload(row.scan_payload)
    if (!payload) continue
    const pageSide = payload.pageSide
    if (pageSide !== 'left' && pageSide !== 'right') continue
    if (pageSide === currentPageSide) continue
    latestBySide.set(pageSide, { pageSide, rows: payload.rows })
  }

  return [...latestBySide.values()].sort(
    (a, b) => pageSideSortOrder(a.pageSide) - pageSideSortOrder(b.pageSide)
  )
}
