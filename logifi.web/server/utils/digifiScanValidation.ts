import type { DigifiScanRow } from '../../app/utils/digifiTypes'

export function countRowsWithCells(rows: DigifiScanRow[]): number {
  return rows.filter((row) =>
    Object.values(row.cells ?? {}).some((value) => (value ?? '').trim() !== '')
  ).length
}

/** True when the model returned far fewer populated rows than expected (truncation / early stop). */
export function isScanResponseIncomplete(
  rows: DigifiScanRow[],
  expectedRowCount: number,
  threshold = 0.5
): boolean {
  if (expectedRowCount <= 0) return false
  return countRowsWithCells(rows) < expectedRowCount * threshold
}
