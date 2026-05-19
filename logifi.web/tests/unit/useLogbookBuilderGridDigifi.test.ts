import { describe, it, expect, beforeEach } from 'vitest'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'

describe('useLogbookBuilderGrid applyScanResults', () => {
  let grid: ReturnType<typeof useLogbookBuilderGrid>

  beforeEach(() => {
    grid = useLogbookBuilderGrid()
    grid.setRowCount(3)
  })

  it('fills left columns only in two-page layout', () => {
    grid.layout.value = 'two-page'
    grid.setTwoPageSplitIndex(1)
    const leftCol = grid.visibleColumns.value[0].id
    const rightCol = grid.visibleColumns.value[1]?.id
    if (!rightCol) return

    const filled = grid.applyScanResults('left', [
      { rowIndex: 0, cells: { [leftCol]: 'KORD', [rightCol]: 'SHOULD_NOT' } },
    ])
    expect(grid.rows.value[0].cells[leftCol]).toBe('KORD')
    expect(grid.rows.value[0].cells[rightCol]).toBe('')
    expect(filled).toBe(1)
  })

  it('appends right page rows in single layout', () => {
    grid.layout.value = 'single'
    const col = grid.visibleColumns.value[0].id

    grid.applyScanResults('left', [{ rowIndex: 0, cells: { [col]: 'A' } }])
    grid.applyScanResults('right', [{ rowIndex: 0, cells: { [col]: 'B' } }])

    expect(grid.rows.value[0].cells[col]).toBe('A')
    expect(grid.rows.value[1].cells[col]).toBe('B')
  })
})
