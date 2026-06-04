import { describe, it, expect, beforeEach } from 'vitest'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'

describe('useLogbookBuilderGrid undo/redo', () => {
  let grid: ReturnType<typeof useLogbookBuilderGrid>

  beforeEach(() => {
    grid = useLogbookBuilderGrid()
    grid.setRowCount(2)
  })

  it('undo restores previous cell value after setCell', () => {
    const col = grid.visibleColumns.value[0].id
    grid.pushUndoSnapshot()
    grid.setCell(0, col, 'changed')
    expect(grid.rows.value[0].cells[col]).toBe('changed')
    expect(grid.undo()).toBe(true)
    expect(grid.rows.value[0].cells[col]).toBe('')
    expect(grid.canRedo.value).toBe(true)
  })

  it('redo reapplies undone change', () => {
    const col = grid.visibleColumns.value[0].id
    grid.pushUndoSnapshot()
    grid.setCell(0, col, 'B')
    grid.undo()
    expect(grid.redo()).toBe(true)
    expect(grid.rows.value[0].cells[col]).toBe('B')
  })

  it('caps undo stack at 50 entries', () => {
    const col = grid.visibleColumns.value[0].id
    for (let i = 0; i < 55; i++) {
      grid.pushUndoSnapshot()
      grid.setCell(0, col, String(i))
    }
    let undoCount = 0
    while (grid.undo()) undoCount++
    expect(undoCount).toBe(50)
  })

  it('applyScanResults pushes undo so scan can be reverted', () => {
    const col = grid.visibleColumns.value[0].id
    grid.setCell(0, col, 'manual')
    grid.applyScanResults('left', [{ rowIndex: 0, cells: { [col]: 'AI' } }])
    expect(grid.rows.value[0].cells[col]).toBe('AI')
    grid.undo()
    expect(grid.rows.value[0].cells[col]).toBe('manual')
  })
})
