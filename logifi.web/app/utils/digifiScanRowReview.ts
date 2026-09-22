import type { DigifiTemplateColumn } from '~/utils/digifiTypes'
import type { DigifiScanRow } from '~/utils/digifiTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'

const TIME_FIELD_KEYS: Set<LogbookColumnKey> = new Set([
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
])

const IDENTITY_FIELD_KEYS: Set<LogbookColumnKey> = new Set([
  'date',
  'aircraft',
  'identification',
  'flightNumber',
])

function parseTimeCell(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number.parseFloat(trimmed.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function rowMaxTimeValue(row: DigifiScanRow, columns: DigifiTemplateColumn[]): number | null {
  let max: number | null = null
  for (const column of columns) {
    if (!column.fieldKey || !TIME_FIELD_KEYS.has(column.fieldKey)) continue
    const n = parseTimeCell(row.cells[column.id] ?? '')
    if (n == null) continue
    max = max == null ? n : Math.max(max, n)
  }
  return max
}

const PRIMARY_TIME_FIELD_ORDER: LogbookColumnKey[] = [
  'total',
  'pic',
  'dualG',
  'dualR',
  'sic',
  'solo',
  'night',
  'actual',
  'hood',
  'xc',
]

/** Primary duration on the row (total / PIC / Dual G, etc.) for same-duration cluster checks. */
export function rowPrimaryTimeValue(
  row: DigifiScanRow,
  columns: DigifiTemplateColumn[]
): number | null {
  for (const fieldKey of PRIMARY_TIME_FIELD_ORDER) {
    const column = columnByField(columns, fieldKey)
    if (!column) continue
    const n = parseTimeCell(row.cells[column.id] ?? '')
    if (n != null) return n
  }
  return rowMaxTimeValue(row, columns)
}

const SAME_DURATION_EPSILON = 0.05

function timesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < SAME_DURATION_EPSILON
}

/** Row indices that sit in a run of 2+ consecutive lines with the same primary duration. */
export function findSameDurationClusterRowIndices(
  rows: DigifiScanRow[],
  columns: DigifiTemplateColumn[],
  expectedRowCount: number
): Set<number> {
  const inRange = rows
    .filter((row) => row.rowIndex >= 0 && row.rowIndex < expectedRowCount)
    .sort((a, b) => a.rowIndex - b.rowIndex)

  const clusterRows = new Set<number>()
  let runStart = 0

  while (runStart < inRange.length) {
    const anchorTime = rowPrimaryTimeValue(inRange[runStart]!, columns)
    if (anchorTime == null) {
      runStart += 1
      continue
    }

    let runEnd = runStart
    while (runEnd + 1 < inRange.length) {
      const next = inRange[runEnd + 1]!
      if (next.rowIndex !== inRange[runEnd]!.rowIndex + 1) break
      const nextTime = rowPrimaryTimeValue(next, columns)
      if (nextTime == null || !timesMatch(anchorTime, nextTime)) break
      runEnd += 1
    }

    const runLength = runEnd - runStart + 1
    if (runLength >= 2) {
      for (let i = runStart; i <= runEnd; i++) {
        clusterRows.add(inRange[i]!.rowIndex)
      }
    }
    runStart = runEnd + 1
  }

  return clusterRows
}

function columnByField(columns: DigifiTemplateColumn[], fieldKey: LogbookColumnKey) {
  return columns.find((c) => c.fieldKey === fieldKey)
}

/** Missing date/ident/aircraft when those columns exist on this scan page. */
export function rowHasThinFlightIdentity(
  row: DigifiScanRow,
  columns: DigifiTemplateColumn[]
): boolean {
  const presentIdentityCols = columns.filter(
    (c) => c.fieldKey && IDENTITY_FIELD_KEYS.has(c.fieldKey)
  )
  if (presentIdentityCols.length === 0) return true

  for (const column of presentIdentityCols) {
    const value = (row.cells[column.id] ?? '').trim()
    if (value && value.toLowerCase() !== 'unknown') return false
  }
  return true
}

/**
 * Last filled row looks like a page-total footer: time far above other rows and thin identity.
 */
export function detectPageFooterOutlierRowIndex(
  rows: DigifiScanRow[],
  columns: DigifiTemplateColumn[],
  expectedRowCount: number
): number | null {
  const inRange = rows.filter((row) => row.rowIndex >= 0 && row.rowIndex < expectedRowCount)
  if (inRange.length < 3) return null

  const withTime = inRange
    .map((row) => ({ row, maxTime: rowMaxTimeValue(row, columns) }))
    .filter((item): item is { row: DigifiScanRow; maxTime: number } => item.maxTime != null)
  if (withTime.length < 3) return null

  const lastFilled = withTime.reduce((best, item) =>
    item.row.rowIndex > best.row.rowIndex ? item : best
  )
  const lastIndex = lastFilled.row.rowIndex
  if (lastIndex < Math.max(2, expectedRowCount - 2)) {
    // Footer totals usually sit on the last one or two lines of the page.
    return null
  }

  const others = withTime.filter((item) => item.row.rowIndex !== lastIndex)
  if (others.length < 2) return null

  const otherMax = Math.max(...others.map((item) => item.maxTime))
  const medianOther = median(others.map((item) => item.maxTime))
  const lastTime = lastFilled.maxTime

  const outlier =
    lastTime >= Math.max(otherMax * 2.5, medianOther * 3, otherMax + 4) && lastTime >= 5
  if (!outlier) return null
  if (!rowHasThinFlightIdentity(lastFilled.row, columns)) return null
  return lastIndex
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

export function countRemarksPipes(value: string): number {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return 0
  return trimmed.split(/\s\|\s/).length - 1
}

export interface RemarksMergeSuspect {
  rowIndex: number
  focusRows: number[]
  message: string
}

export function findRemarksMergeSuspects(
  rows: DigifiScanRow[],
  columns: DigifiTemplateColumn[],
  expectedRowCount: number
): RemarksMergeSuspect[] {
  const remarksCol = columnByField(columns, 'remarks')
  if (!remarksCol) return []

  const inRange = rows.filter((row) => row.rowIndex >= 0 && row.rowIndex < expectedRowCount)
  const pipeCounts = inRange.map((row) => countRemarksPipes(row.cells[remarksCol.id] ?? ''))
  const nonZero = pipeCounts.filter((n) => n > 0)
  const pageMedian = nonZero.length > 0 ? median(nonZero) : 0

  const sameDurationClusterRows = findSameDurationClusterRowIndices(
    rows,
    columns,
    expectedRowCount
  )
  const suspects: RemarksMergeSuspect[] = []

  for (const row of inRange) {
    const remarks = (row.cells[remarksCol.id] ?? '').trim()
    const inSameDurationCluster = sameDurationClusterRows.has(row.rowIndex)
    const pipes = remarks ? countRemarksPipes(remarks) : 0
    const relativeHigh = pipes > 0 && pipes >= Math.max(pageMedian * 2, pageMedian + 2, 3)
    const fat = remarks.length >= 100 && pipes >= Math.max(1, pageMedian)

    if (!remarks && !inSameDurationCluster) continue
    if (remarks && !relativeHigh && !fat && !inSameDurationCluster) continue
    if (!remarks && inSameDurationCluster) {
      // Cluster signal only — still offer band re-scan without requiring remarks text.
    } else if (!relativeHigh && !fat && !inSameDurationCluster) {
      continue
    }

    const focusRows = [row.rowIndex - 1, row.rowIndex, row.rowIndex + 1].filter(
      (idx) => idx >= 0 && idx < expectedRowCount
    )
    const parts: string[] = []
    if (inSameDurationCluster) {
      parts.push('consecutive rows with the same duration (possible skipped or merged line)')
    }
    if (relativeHigh) parts.push('unusually many remark segments for this page')
    if (fat) parts.push('long remarks block')
    suspects.push({
      rowIndex: row.rowIndex,
      focusRows,
      message: `Line ${row.rowIndex + 1} may merge two flights (${parts.join('; ')}). Re-scan remarks for this band if needed.`,
    })
  }

  return suspects
}

export function applyRemarksMergeSuspectMeta(
  rows: DigifiScanRow[],
  columns: DigifiTemplateColumn[],
  suspects: RemarksMergeSuspect[]
): DigifiScanRow[] {
  const remarksCol = columnByField(columns, 'remarks')
  if (!remarksCol || suspects.length === 0) return rows

  const byRow = new Map(suspects.map((s) => [s.rowIndex, s]))
  return rows.map((row) => {
    const suspect = byRow.get(row.rowIndex)
    if (!suspect) return row
    const raw = row.cells[remarksCol.id] ?? ''
    return {
      ...row,
      cellMeta: {
        ...(row.cellMeta ?? {}),
        [remarksCol.id]: {
          fieldKey: 'remarks',
          rawValue: raw,
          resolvedValue: raw,
          strategy: 'raw',
          confidence: 'low',
          autoApplied: false,
          needsReview: true,
          message: suspect.message,
        },
      },
    }
  })
}

export function formatPageFooterDropMessage(rowIndex: number): string {
  return `Removed line ${rowIndex + 1} as a likely page total (not a flight).`
}
