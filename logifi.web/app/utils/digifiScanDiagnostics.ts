import type { DigifiScanRow } from './digifiTypes'

export interface DigifiScanRowDiagnostics {
  rowsReturned: number
  distinctRowIndices: number[]
  missingRowIndices: number[]
  duplicateRowIndices: number[]
  emptyRowIndices: number[]
  hasGaps: boolean
}

/** True when any cell value contains the in-box remarks join separator. */
export function hasPipeJoinedCellValues(scanRows: DigifiScanRow[]): boolean {
  return scanRows.some((row) =>
    Object.values(row.cells ?? {}).some((value) => (value ?? '').includes(' | '))
  )
}

/** Compare scan output to expected row count for UI warnings. */
export function analyzeDigifiScanRows(
  scanRows: DigifiScanRow[],
  expectedRowCount: number
): DigifiScanRowDiagnostics {
  const rowCounts = new Map<number, number>()
  const rowHasContent = new Map<number, boolean>()

  for (const row of scanRows) {
    rowCounts.set(row.rowIndex, (rowCounts.get(row.rowIndex) ?? 0) + 1)
    const hasAnyCell = Object.values(row.cells ?? {}).some((value) => (value ?? '').trim() !== '')
    rowHasContent.set(row.rowIndex, (rowHasContent.get(row.rowIndex) ?? false) || hasAnyCell)
  }

  const indices = [...rowCounts.keys()].sort((a, b) => a - b)
  const missingRowIndices: number[] = []
  for (let i = 0; i < expectedRowCount; i++) {
    if (!indices.includes(i)) missingRowIndices.push(i)
  }
  const duplicateRowIndices = [...rowCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([idx]) => idx)
    .sort((a, b) => a - b)
  const emptyRowIndices = indices.filter((idx) => !rowHasContent.get(idx))
  const hasGaps =
    indices.length > 1 &&
    indices.some((idx, i) => i > 0 && idx !== indices[i - 1] + 1)
  return {
    rowsReturned: indices.length,
    distinctRowIndices: indices,
    missingRowIndices,
    duplicateRowIndices,
    emptyRowIndices,
    hasGaps,
  }
}

export function formatDigifiScanWarning(
  diagnostics: DigifiScanRowDiagnostics,
  expectedRowCount: number,
  scanRows?: DigifiScanRow[]
): string | null {
  const { rowsReturned, missingRowIndices, duplicateRowIndices, emptyRowIndices, hasGaps } = diagnostics
  if (
    rowsReturned >= expectedRowCount &&
    missingRowIndices.length === 0 &&
    duplicateRowIndices.length === 0 &&
    !hasGaps
  ) {
    return null
  }
  const parts: string[] = []
  if (rowsReturned < expectedRowCount) {
    parts.push(
      `Expected ${expectedRowCount} rows but the scan returned ${rowsReturned}. Check that Rows is set to ${expectedRowCount} and scan with a clearer photo.`
    )
    if (scanRows && hasPipeJoinedCellValues(scanRows)) {
      parts.push(
        'A remarks cell contains " | " while rows are missing — adjacent flight lines may have been merged into one cell (common when consecutive times look identical). Split them onto separate rows or re-scan.'
      )
    }
  }
  if (missingRowIndices.length > 0) {
    const preview = missingRowIndices.slice(0, 5).map((i) => i + 1).join(', ')
    const suffix = missingRowIndices.length > 5 ? '…' : ''
    parts.push(
      `Missing row line(s) on the grid: ${preview}${suffix} (paper row numbers). Fill these in manually.`
    )
    const hasEarlyGap = missingRowIndices.some((i) => i <= 2)
    if (hasEarlyGap) {
      parts.push(
        'Rows near the top of the page were skipped — later lines may be shifted up. Confirm Rows matches flight lines only (not the totals row), then fix or re-scan.'
      )
    }
  }
  if (duplicateRowIndices.length > 0) {
    const preview = duplicateRowIndices.slice(0, 5).map((i) => i + 1).join(', ')
    const suffix = duplicateRowIndices.length > 5 ? '…' : ''
    parts.push(`Some rows were read more than once (${preview}${suffix}), which can merge separate paper lines together.`)
  }
  if (emptyRowIndices.length > 0 && (rowsReturned < expectedRowCount || missingRowIndices.length > 0 || hasGaps)) {
    const preview = emptyRowIndices.slice(0, 5).map((i) => i + 1).join(', ')
    const suffix = emptyRowIndices.length > 5 ? '…' : ''
    parts.push(`Blank scan rows detected at ${preview}${suffix}. Verify those paper lines before importing.`)
  }
  if (hasGaps && rowsReturned >= expectedRowCount) {
    parts.push('Some row indices were skipped — verify entries are on the correct lines.')
  }
  return parts.join(' ')
}
