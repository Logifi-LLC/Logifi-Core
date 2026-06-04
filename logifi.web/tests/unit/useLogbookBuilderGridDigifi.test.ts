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

    const result = grid.applyScanResults('left', [
      { rowIndex: 0, cells: { [leftCol]: 'KORD', [rightCol]: 'SHOULD_NOT' } },
    ])
    expect(grid.rows.value[0].cells[leftCol]).toBe('KORD')
    expect(grid.rows.value[0].cells[rightCol]).toBe('')
    expect(result.filled).toBe(1)
    expect(result.allowedColumnIds).toEqual([leftCol])
  })

  it('appends right page rows in single layout', () => {
    grid.layout.value = 'single'
    const col = grid.visibleColumns.value[0].id

    grid.applyScanResults('left', [{ rowIndex: 0, cells: { [col]: 'A' } }])
    grid.applyScanResults('right', [{ rowIndex: 0, cells: { [col]: 'B' } }])

    expect(grid.rows.value[0].cells[col]).toBe('A')
    expect(grid.rows.value[1].cells[col]).toBe('B')
  })

  it('blocks import when Digifi-missing rows are still empty', () => {
    const col = grid.visibleColumns.value[0].id

    const leftResult = grid.applyScanResults('left', [{ rowIndex: 0, cells: { [col]: 'A' } }])
    grid.recordDigifiScanStatus({
      pageSide: 'left',
      expectedRowCount: 3,
      baseRow: leftResult.baseRow,
      allowedColumnIds: leftResult.allowedColumnIds,
      rowsReturned: 1,
      distinctRowIndices: [0],
      missingRowIndices: [1, 2],
      duplicateRowIndices: [],
      emptyRowIndices: [],
      hasGaps: false,
      strategyUsed: 'page-overview',
      chunkCount: 0,
      rescueAttempted: false,
      rescueRecoveredCount: 0,
    })

    expect(grid.getDigifiImportBlockers()).toHaveLength(1)
    grid.setCell(1, col, 'B')
    grid.setCell(2, col, 'C')
    expect(grid.getDigifiImportBlockers()).toEqual([])
  })

  it('stores Digifi cell metadata and clears review state after manual edit', () => {
    const col = grid.visibleColumns.value[0].id

    grid.applyScanResults('left', [{
      rowIndex: 0,
      cells: { [col]: 'N5724S' },
      cellMeta: {
        [col]: {
          fieldKey: 'identification',
          rawValue: 'N5724S',
          resolvedValue: 'N5724S',
          strategy: 'ambiguous',
          confidence: 'low',
          autoApplied: false,
          needsReview: true,
          candidates: [{ value: 'N5724J', score: 0.9, distance: 1, source: 'history' }],
        },
      },
    }])

    expect(grid.rows.value[0].digifiCellMeta?.[col]?.needsReview).toBe(true)

    grid.setCell(0, col, 'N5724J')
    grid.noteDigifiCellManualEdit(0, col, 'N5724J')

    expect(grid.rows.value[0].digifiCellMeta?.[col]?.userConfirmed).toBe(true)
    expect(grid.rows.value[0].digifiCellMeta?.[col]?.needsReview).toBe(false)
  })

})
