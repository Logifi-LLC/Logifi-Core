import type { DigifiScanRow, DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import type { LogbookColumnKey } from '../../app/utils/logbookTypes'

const TOTALS_KEYWORD_RE =
  /\b(total|totals|brought forward|carried forward|amount forward|page total)\b/i

const NUMERIC_FIELD_KEYS: Set<LogbookColumnKey> = new Set([
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

function parseNumericCell(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number.parseFloat(trimmed.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function rowHasTotalsKeyword(row: DigifiScanRow): boolean {
  return Object.values(row.cells ?? {}).some((value) => TOTALS_KEYWORD_RE.test(value ?? ''))
}

function isTotalsShapedNumericRow(
  row: DigifiScanRow,
  targetColumns: DigifiTemplateColumn[]
): boolean {
  const remarksCol = targetColumns.find((c) => c.fieldKey === 'remarks')
  const remarksValue = remarksCol ? (row.cells[remarksCol.id] ?? '').trim() : ''
  if (remarksValue && !TOTALS_KEYWORD_RE.test(remarksValue)) {
    return false
  }

  let filledNumericCount = 0
  let hasLargeCumulative = false

  for (const column of targetColumns) {
    if (!column.fieldKey || !NUMERIC_FIELD_KEYS.has(column.fieldKey)) continue
    const value = (row.cells[column.id] ?? '').trim()
    if (!value) continue
    const n = parseNumericCell(value)
    if (n == null) continue
    filledNumericCount += 1
    if (n >= 20) hasLargeCumulative = true
  }

  return filledNumericCount >= 4 && hasLargeCumulative
}

function shouldStripRow(
  row: DigifiScanRow,
  targetColumns: DigifiTemplateColumn[],
  expectedRowCount: number
): boolean {
  if (row.rowIndex < 0 || row.rowIndex >= expectedRowCount) return true
  if (rowHasTotalsKeyword(row)) return true
  return isTotalsShapedNumericRow(row, targetColumns)
}

export function sanitizeDigifiScanRows(
  rows: DigifiScanRow[],
  targetColumns: DigifiTemplateColumn[],
  expectedRowCount: number
): { rows: DigifiScanRow[]; strippedRowIndices: number[] } {
  const strippedRowIndices: number[] = []
  const kept: DigifiScanRow[] = []

  for (const row of rows) {
    if (shouldStripRow(row, targetColumns, expectedRowCount)) {
      if (row.rowIndex >= 0 && row.rowIndex < expectedRowCount) {
        strippedRowIndices.push(row.rowIndex)
      }
      continue
    }
    kept.push(row)
  }

  return {
    rows: kept,
    strippedRowIndices: [...new Set(strippedRowIndices)].sort((a, b) => a - b),
  }
}
