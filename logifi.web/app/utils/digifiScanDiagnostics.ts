import type { DigifiScanRow } from './digifiTypes'

export interface DigifiScanRowDiagnostics {
  rowsReturned: number
  distinctRowIndices: number[]
  missingRowIndices: number[]
  duplicateRowIndices: number[]
  emptyRowIndices: number[]
  hasGaps: boolean
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
  expectedRowCount: number
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
  }
  if (missingRowIndices.length > 0) {
    const preview = missingRowIndices.slice(0, 5).map((i) => i + 1).join(', ')
    const suffix = missingRowIndices.length > 5 ? '…' : ''
    parts.push(
      `Missing row line(s) on the grid: ${preview}${suffix} (paper row numbers). Fill these in manually.`
    )
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
