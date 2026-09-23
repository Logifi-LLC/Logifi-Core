import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

function rowHasFlightData(grid: Grid, rowIdx: number): boolean {
  const row = grid.rows.value[rowIdx]
  if (!row?.cells) return false
  return grid.visibleColumns.value.some((col) => (row.cells[col.id] ?? '').trim() !== '')
}

/** Fill manual-only Digifi columns (role) from setup defaults on rows that have scan data. */
export function seedDigifiManualFieldDefaults(grid: Grid): void {
  const roleCol = grid.visibleColumns.value.find((c) => c.fieldKey === 'role')
  if (!roleCol) return

  const defaultRole = (grid.defaultImportRole.value ?? 'PIC').trim() || 'PIC'

  for (let rowIdx = 0; rowIdx < grid.rows.value.length; rowIdx++) {
    if (!rowHasFlightData(grid, rowIdx)) continue
    const current = (grid.rows.value[rowIdx]?.cells?.[roleCol.id] ?? '').trim()
    if (!current) {
      grid.setCell(rowIdx, roleCol.id, defaultRole)
    }
  }
}
