import type { DigifiScanRow } from '../../app/utils/digifiTypes'

export function mergeRowsByIndex(rows: DigifiScanRow[]): {
  rows: DigifiScanRow[]
  duplicateRowIndices: number[]
} {
  const rowMap = new Map<number, DigifiScanRow>()
  const duplicateRowIndices = new Set<number>()

  for (const row of rows) {
    const existing = rowMap.get(row.rowIndex)
    if (!existing) {
      rowMap.set(row.rowIndex, {
        rowIndex: row.rowIndex,
        cells: { ...row.cells },
        tags: row.tags?.map((tag) => tag.trim()).filter(Boolean),
      })
      continue
    }

    duplicateRowIndices.add(row.rowIndex)
    for (const [columnId, value] of Object.entries(row.cells)) {
      const nextValue = (value ?? '').trim()
      if (!nextValue) continue
      if (!(existing.cells[columnId] ?? '').trim()) {
        existing.cells[columnId] = nextValue
      }
    }
    if (row.tags?.length) {
      existing.tags = Array.from(
        new Set([...(existing.tags ?? []), ...row.tags.map((tag) => tag.trim()).filter(Boolean)])
      )
    }
  }

  return {
    rows: [...rowMap.values()].sort((a, b) => a.rowIndex - b.rowIndex),
    duplicateRowIndices: [...duplicateRowIndices].sort((a, b) => a - b),
  }
}

export function mergePrimaryAndRescueRows(
  primaryRows: DigifiScanRow[],
  rescueRows: DigifiScanRow[]
): DigifiScanRow[] {
  const rowMap = new Map<number, DigifiScanRow>(
    primaryRows.map((row) => [
      row.rowIndex,
      {
        rowIndex: row.rowIndex,
        cells: { ...row.cells },
        tags: row.tags ? [...row.tags] : [],
      },
    ])
  )

  for (const rescueRow of rescueRows) {
    const existing = rowMap.get(rescueRow.rowIndex)
    if (!existing) {
      rowMap.set(rescueRow.rowIndex, {
        rowIndex: rescueRow.rowIndex,
        cells: { ...rescueRow.cells },
        tags: rescueRow.tags ? [...rescueRow.tags] : [],
      })
      continue
    }
    for (const [columnId, value] of Object.entries(rescueRow.cells)) {
      const nextValue = (value ?? '').trim()
      if (!nextValue) continue
      if (!(existing.cells[columnId] ?? '').trim()) {
        existing.cells[columnId] = nextValue
      }
    }
    if (rescueRow.tags?.length) {
      existing.tags = Array.from(
        new Set([...(existing.tags ?? []), ...rescueRow.tags.map((tag) => tag.trim()).filter(Boolean)])
      )
    }
  }

  return [...rowMap.values()].sort((a, b) => a.rowIndex - b.rowIndex)
}
