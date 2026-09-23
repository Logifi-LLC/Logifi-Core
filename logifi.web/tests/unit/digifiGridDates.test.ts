import { describe, expect, it } from 'vitest'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { renormalizeBuilderGridDates } from '~/utils/digifiGridDates'
import { seedDigifiManualFieldDefaults } from '~/utils/digifiManualFieldDefaults'

describe('renormalizeBuilderGridDates', () => {
  it('fixes a second 1/31 after the first on a locked 2023 spread', () => {
    const grid = useLogbookBuilderGrid()
    grid.defaultYear.value = 2023
    const dateCol = grid.visibleColumns.value.find((c) => c.fieldKey === 'date')
    expect(dateCol).toBeTruthy()
    grid.setCell(0, dateCol!.id, '2023-01-31')
    grid.setCell(1, dateCol!.id, '2024-01-31')
    renormalizeBuilderGridDates(grid)
    expect(grid.rows.value[1]?.cells?.[dateCol!.id]).toBe('2023-01-31')
  })

  it('keeps two 1/31 then three 2/1 on a locked spread after OCR year noise', () => {
    const grid = useLogbookBuilderGrid()
    grid.defaultYear.value = 2023
    const dateCol = grid.visibleColumns.value.find((c) => c.fieldKey === 'date')
    expect(dateCol).toBeTruthy()
    const iso = [
      '2023-01-28',
      '2023-01-31',
      '2024-01-31',
      '2024-02-01',
      '2023-02-01',
      '2024-02-01',
    ]
    iso.forEach((value, rowIdx) => grid.setCell(rowIdx, dateCol!.id, value))
    renormalizeBuilderGridDates(grid)
    const values = grid.rows.value.slice(0, 6).map((row) => row.cells?.[dateCol!.id])
    expect(values).toEqual([
      '2023-01-28',
      '2023-01-31',
      '2023-01-31',
      '2023-02-01',
      '2023-02-01',
      '2023-02-01',
    ])
  })
})

describe('seedDigifiManualFieldDefaults', () => {
  it('fills empty role cells from default import role', () => {
    const grid = useLogbookBuilderGrid()
    grid.defaultImportRole.value = 'Instructor'
    const roleCol = grid.columns.value.find((c) => c.fieldKey === 'role')
    const dateCol = grid.visibleColumns.value.find((c) => c.fieldKey === 'date')
    if (!roleCol) {
      grid.addColumn('role')
    }
    const role = grid.visibleColumns.value.find((c) => c.fieldKey === 'role')!
    const date = dateCol ?? grid.visibleColumns.value[0]!
    grid.setCell(0, date.id, '2023-01-02')
    seedDigifiManualFieldDefaults(grid)
    expect(grid.rows.value[0]?.cells?.[role.id]).toBe('Instructor')
  })
})
