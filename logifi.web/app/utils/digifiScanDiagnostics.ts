import type { DigifiScanRow } from './digifiTypes'

export interface DigifiScanRowDiagnostics {
  rowsReturned: number
  distinctRowIndices: number[]
  missingRowIndices: number[]
  hasGaps: boolean
}

/** Compare scan output to expected row count for UI warnings. */
export function analyzeDigifiScanRows(
  scanRows: DigifiScanRow[],
  expectedRowCount: number
): DigifiScanRowDiagnostics {
  const indices = [...new Set(scanRows.map((r) => r.rowIndex))].sort((a, b) => a - b)
  const missingRowIndices: number[] = []
  for (let i = 0; i < expectedRowCount; i++) {
    if (!indices.includes(i)) missingRowIndices.push(i)
  }
  const hasGaps =
    indices.length > 1 &&
    indices.some((idx, i) => i > 0 && idx !== indices[i - 1] + 1)
  return {
    rowsReturned: indices.length,
    distinctRowIndices: indices,
    missingRowIndices,
    hasGaps,
  }
}

export function formatDigifiScanWarning(
  diagnostics: DigifiScanRowDiagnostics,
  expectedRowCount: number
): string | null {
  const { rowsReturned, missingRowIndices, hasGaps } = diagnostics
  if (rowsReturned >= expectedRowCount && missingRowIndices.length === 0 && !hasGaps) {
    return null
  }
  const parts: string[] = []
  if (rowsReturned < expectedRowCount) {
    parts.push(
      `Expected ${expectedRowCount} rows but the scan returned ${rowsReturned}. Check that Rows is set to ${expectedRowCount} and rescan with a clearer photo.`
    )
  } else if (missingRowIndices.length > 0) {
    const preview = missingRowIndices.slice(0, 5).map((i) => i + 1).join(', ')
    const suffix = missingRowIndices.length > 5 ? '…' : ''
    parts.push(
      `Missing row line(s) on the grid: ${preview}${suffix} (paper row numbers). Fill these in manually or rescan.`
    )
  }
  if (hasGaps && rowsReturned >= expectedRowCount) {
    parts.push('Some row indices were skipped — verify entries are on the correct lines.')
  }
  return parts.join(' ')
}
