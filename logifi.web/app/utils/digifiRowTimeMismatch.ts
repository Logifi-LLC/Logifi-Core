import { parseImportDuration } from '../../shared/logbookDataBridge/formatters'
import type { LogbookColumnKey } from './logbookTypes'

/** Ignore tenth-hour rounding. A gap at or under this is not a mismatch. */
export const DIGIFI_ROW_TIME_MISMATCH_TOLERANCE = 0.05

const ROLE_FIELD_KEYS = new Set<LogbookColumnKey>(['pic', 'sic', 'dualG', 'dualR'])

export interface DigifiRowTimeColumn {
  id: string
  fieldKey: LogbookColumnKey | null
  label?: string
  categoryClassValue?: string | null
}

export interface DigifiRowTimeMismatch {
  columnId: string
  message: string
}

interface ComparedCell {
  columnId: string
  label: string
  raw: string
}

function isCategoryTimeColumn(column: DigifiRowTimeColumn): boolean {
  return column.fieldKey === 'categoryClass' && Boolean(column.categoryClassValue?.trim())
}

function columnLabel(column: DigifiRowTimeColumn): string {
  if (isCategoryTimeColumn(column)) return column.categoryClassValue!.trim()
  const label = column.label?.trim()
  if (label) return label
  if (column.fieldKey === 'pic') return 'PIC'
  if (column.fieldKey === 'sic') return 'SIC'
  if (column.fieldKey === 'dualG') return 'Dual Given'
  if (column.fieldKey === 'dualR') return 'Dual Received'
  return 'Time'
}

function joinCompared(items: ComparedCell[]): string {
  return items.map((item) => `${item.label} ${item.raw}`).join(' and ')
}

function formatMismatchMessage(
  greater: ComparedCell[],
  differs: ComparedCell[],
  totalRaw: string
): string {
  const parts: string[] = []
  if (greater.length === 1) {
    parts.push(`${joinCompared(greater)} is greater than Total ${totalRaw}`)
  } else if (greater.length > 1) {
    parts.push(`${joinCompared(greater)} are greater than Total ${totalRaw}`)
  }
  if (differs.length === 1) {
    parts.push(`${joinCompared(differs)} doesn't match Total ${totalRaw}`)
  } else if (differs.length > 1) {
    parts.push(`${joinCompared(differs)} don't match Total ${totalRaw}`)
  }
  return parts.join('. ')
}

/**
 * Advisory row check for Digifi Review.
 * Flags Total plus the mismatched cells when a filled role time is above Total,
 * or a category time column on this scan (ASEL, AMEL, …) disagrees with Total.
 * Does not change cell values and does not block Validate or Import.
 */
export function findDigifiRowTimeMismatches(
  cells: Record<string, string> | null | undefined,
  columns: readonly DigifiRowTimeColumn[]
): DigifiRowTimeMismatch[] {
  const totalColumn = columns.find((column) => column.fieldKey === 'total')
  if (!totalColumn || !cells) return []

  const totalRaw = (cells[totalColumn.id] ?? '').trim()
  const total = parseImportDuration(totalRaw)
  if (total == null || total <= 0) return []

  const greater: ComparedCell[] = []
  const differs: ComparedCell[] = []

  for (const column of columns) {
    if (column.id === totalColumn.id) continue
    const raw = (cells[column.id] ?? '').trim()
    if (!raw) continue
    const value = parseImportDuration(raw)
    if (value == null || value <= 0) continue

    if (column.fieldKey && ROLE_FIELD_KEYS.has(column.fieldKey)) {
      if (value > total + DIGIFI_ROW_TIME_MISMATCH_TOLERANCE) {
        greater.push({ columnId: column.id, label: columnLabel(column), raw })
      }
      continue
    }

    if (isCategoryTimeColumn(column) && Math.abs(value - total) > DIGIFI_ROW_TIME_MISMATCH_TOLERANCE) {
      differs.push({ columnId: column.id, label: columnLabel(column), raw })
    }
  }

  if (greater.length === 0 && differs.length === 0) return []

  const message = formatMismatchMessage(greater, differs, totalRaw)
  const columnIds = [
    totalColumn.id,
    ...greater.map((item) => item.columnId),
    ...differs.map((item) => item.columnId),
  ]
  return columnIds.map((columnId) => ({ columnId, message }))
}

export function digifiRowTimeMismatchMap(
  rows: readonly { cells?: Record<string, string> | null }[],
  columns: readonly DigifiRowTimeColumn[]
): Map<string, string> {
  const map = new Map<string, string>()
  rows.forEach((row, rowIdx) => {
    for (const flag of findDigifiRowTimeMismatches(row.cells, columns)) {
      map.set(`${rowIdx}:${flag.columnId}`, flag.message)
    }
  })
  return map
}
