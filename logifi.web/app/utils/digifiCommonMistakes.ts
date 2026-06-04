import type { BuilderColumn, BuilderLayout, BuilderRow } from './logbookBuilderTypes'
import type { DigifiPageSide, DigifiScanCellMeta } from './digifiTypes'
import type { LogbookColumnKey } from './logbookTypes'

export interface DigifiCommonMistakeChecklistItem {
  id: string
  title: string
  hint: string
}

export const DIGIFI_COMMON_MISTAKE_CHECKLIST: DigifiCommonMistakeChecklistItem[] = [
  {
    id: 'route',
    title: 'From / To / Route',
    hint:
      'Verify departure vs destination vs intermediates. XC and pattern work often list multiple airports — AI may put a middle stop in From or To.',
  },
  {
    id: 'landings',
    title: 'Landings',
    hint:
      'Day and night landing counts are tiny digits in small boxes — easy to misread 1 vs 7 or skip a landing.',
  },
  {
    id: 'instrument',
    title: 'Night / Actual / Sim / Approaches',
    hint:
      'Adjacent narrow time/count columns; confirm each value is in the correct column, not shifted left or right.',
  },
  {
    id: 'dual',
    title: 'Dual Given / Dual Received',
    hint:
      'When your paper has both columns, AI often swaps or reads the neighbor cell — check every filled dual hour against the photo.',
  },
]

export const DIGIFI_ROUTE_FIELD_KEYS: readonly LogbookColumnKey[] = [
  'departure',
  'destination',
  'route',
  'fromTo',
]

export const DIGIFI_LANDING_FIELD_KEYS: readonly LogbookColumnKey[] = [
  'dayLandings',
  'nightLandings',
]

export const DIGIFI_INSTRUMENT_APPROACH_FIELD_KEYS: readonly LogbookColumnKey[] = [
  'night',
  'actual',
  'hood',
  'approach',
  'approachType',
]

export const DIGIFI_DUAL_FIELD_KEYS: readonly LogbookColumnKey[] = ['dualG', 'dualR']

const ROUTE_FIELD_KEY_SET = new Set<LogbookColumnKey>(DIGIFI_ROUTE_FIELD_KEYS)
const LANDING_FIELD_KEY_SET = new Set<LogbookColumnKey>(DIGIFI_LANDING_FIELD_KEYS)
const INSTRUMENT_APPROACH_FIELD_KEY_SET = new Set<LogbookColumnKey>(DIGIFI_INSTRUMENT_APPROACH_FIELD_KEYS)
const DUAL_FIELD_KEY_SET = new Set<LogbookColumnKey>(DIGIFI_DUAL_FIELD_KEYS)

const VERIFY_CAREFULLY_MESSAGES: Partial<Record<LogbookColumnKey, string>> = {
  departure: 'Double-check From matches the first departure on the paper.',
  destination: 'Double-check To is the final destination, not an intermediate stop.',
  route: 'Double-check Route lists intermediates only, not departure or destination.',
  fromTo: 'Double-check From and To — multi-airport flights are often misread.',
  dayLandings: 'Double-check day landing count — small digits are easy to misread.',
  nightLandings: 'Double-check night landing count — small digits are easy to misread.',
  night: 'Double-check night time is in the correct column.',
  actual: 'Double-check actual instrument time is in the correct column.',
  hood: 'Double-check simulated instrument (hood) time is in the correct column.',
  approach: 'Double-check approach count is in the correct column.',
  approachType: 'Double-check approach type matches the paper.',
  dualG: 'Double-check Dual Given — adjacent dual columns are often swapped.',
  dualR: 'Double-check Dual Received — adjacent dual columns are often swapped.',
}

/** Prompt block appended to Digifi Gemini scans (shared with server). */
export const DIGIFI_COMMON_MISTAKE_PROMPT_RULES = [
  'Common mistakes to avoid:',
  'From/departure = first departure airport only; To/destination = final airport only; Route = intermediate stops only (not departure or destination).',
  'XC and pattern flights may list multiple airports — do not put intermediate stops in From or To.',
  'Landings (day/night) are integer counts, not decimal flight times.',
  'Do not swap adjacent narrow columns: night, actual instrument, simulated (hood), approach count, approach type.',
  'When both Dual Given and Dual Received columns exist, read each value under its printed column header — do not shift into the neighbor cell.',
].join(' ')

export function columnsForDigifiPageSide(
  columns: BuilderColumn[],
  pageSide: DigifiPageSide,
  layout: BuilderLayout,
  splitIndex: number
): BuilderColumn[] {
  const sorted = [...columns].sort((a, b) => a.order - b.order)
  if (layout !== 'two-page') return sorted
  if (pageSide === 'left') return sorted.slice(0, splitIndex)
  return sorted.slice(splitIndex)
}

function pageHasBothDualColumns(pageColumns: BuilderColumn[]): boolean {
  const keys = new Set(pageColumns.map((c) => c.fieldKey).filter(Boolean))
  return keys.has('dualG') && keys.has('dualR')
}

function shouldFlagFieldKey(fieldKey: LogbookColumnKey | null, pageColumns: BuilderColumn[]): boolean {
  if (!fieldKey) return false
  if (ROUTE_FIELD_KEY_SET.has(fieldKey)) return true
  if (LANDING_FIELD_KEY_SET.has(fieldKey)) return true
  if (INSTRUMENT_APPROACH_FIELD_KEY_SET.has(fieldKey)) return true
  if (DUAL_FIELD_KEY_SET.has(fieldKey) && pageHasBothDualColumns(pageColumns)) return true
  return false
}

function verifyCarefullyMessage(fieldKey: LogbookColumnKey | null): string {
  if (!fieldKey) return 'Double-check this AI-filled value against the photo.'
  return VERIFY_CAREFULLY_MESSAGES[fieldKey] ?? 'Double-check this AI-filled value against the photo.'
}

function flagCellMeta(meta: DigifiScanCellMeta, fieldKey: LogbookColumnKey | null): DigifiScanCellMeta {
  if (meta.needsReview) return meta
  return {
    ...meta,
    verifyCarefully: true,
    message: meta.message ?? verifyCarefullyMessage(fieldKey),
  }
}

export interface ApplyDigifiVerifyCarefullyFlagsParams {
  rows: BuilderRow[]
  columns: BuilderColumn[]
  pageSide: DigifiPageSide
  layout: BuilderLayout
  splitIndex: number
  baseRow: number
  scanRowIndices: number[]
  allowedColumnIds: Set<string>
}

/** Mark AI-filled cells in high-mistake areas after a scan. Returns count of newly flagged cells. */
export function applyDigifiVerifyCarefullyFlags(params: ApplyDigifiVerifyCarefullyFlagsParams): number {
  const pageColumns = columnsForDigifiPageSide(
    params.columns,
    params.pageSide,
    params.layout,
    params.splitIndex
  )
  const columnById = new Map(pageColumns.map((col) => [col.id, col]))
  let flagged = 0

  for (const scanRowIndex of params.scanRowIndices) {
    const gridRowIdx = params.baseRow + scanRowIndex
    if (gridRowIdx < 0 || gridRowIdx >= params.rows.length) continue
    const row = params.rows[gridRowIdx]
    if (!row.digifiCellMeta) continue

    for (const colId of params.allowedColumnIds) {
      if (!row.digifiCellMeta[colId]) continue
      const col = columnById.get(colId)
      const fieldKey = col?.fieldKey ?? row.digifiCellMeta[colId].fieldKey
      if (!shouldFlagFieldKey(fieldKey, pageColumns)) continue
      const cellValue = (row.cells[colId] ?? '').trim()
      if (!cellValue) continue

      const meta = row.digifiCellMeta[colId]
      if (meta.needsReview || meta.verifyCarefully) continue

      row.digifiCellMeta[colId] = flagCellMeta(meta, fieldKey)
      flagged++
    }
  }

  return flagged
}

export function countDigifiVerifyCarefullyCells(
  rows: BuilderRow[],
  allowedColumnIds: Iterable<string>
): number {
  const allowed = new Set(allowedColumnIds)
  let count = 0
  for (const row of rows) {
    if (!row.digifiCellMeta) continue
    for (const colId of allowed) {
      const meta = row.digifiCellMeta[colId]
      if (meta?.verifyCarefully && !meta.needsReview && !meta.userConfirmed) count++
    }
  }
  return count
}

export function formatDigifiVerifyCarefullyWarning(count: number): string | null {
  if (count <= 0) return null
  const noun = count === 1 ? 'cell' : 'cells'
  return `${count} ${noun} flagged in common mistake areas — double-check From/To, landings, night/actual/sim/approaches, and dual columns.`
}
