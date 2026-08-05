import { describe, it, expect } from 'vitest'
import {
  buildValuesMatrix,
  cellInRange,
  clearRangeCells,
  copyRangeUpdates,
  fillDownRange,
  fillRightRange,
  findEdgeInDirection,
  findLastUsedCell,
  matrixToTsv,
  moveRangeUpdates,
  normalizeSelectionRange,
  parseTsvMatrix,
  rangesEqual,
  selectionOrActive,
  translateRange,
} from '../../app/utils/logbookBuilderCommands'

describe('logbookBuilderCommands', () => {
  const grid = [
    ['A', 'B', ''],
    ['', 'C', ''],
    ['D', '', ''],
  ]

  const getValue = (row: number, col: number) => grid[row]?.[col] ?? ''

  it('parses and serializes TSV', () => {
    const matrix = parseTsvMatrix('a\tb\nc\td')
    expect(matrix).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(matrixToTsv(matrix)).toBe('a\tb\nc\td')
  })

  it('normalizes selection range', () => {
    expect(normalizeSelectionRange(2, 3, 0, 1, 5, 5)).toEqual({
      startRow: 0,
      endRow: 2,
      startCol: 1,
      endCol: 3,
    })
  })

  it('selectionOrActive prefers selection', () => {
    const sel = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 }
    expect(selectionOrActive(sel, { rowIndex: 2, colIndex: 2 })).toBe(sel)
    expect(selectionOrActive(null, { rowIndex: 2, colIndex: 2 })).toEqual({
      startRow: 2,
      endRow: 2,
      startCol: 2,
      endCol: 2,
    })
  })

  it('buildValuesMatrix reads a block', () => {
    const range = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 }
    expect(buildValuesMatrix(range, getValue)).toEqual([
      ['A', 'B'],
      ['', 'C'],
    ])
  })

  it('fillDown copies top row into rows below', () => {
    const range = { startRow: 0, endRow: 2, startCol: 0, endCol: 1 }
    const updates = fillDownRange(range, getValue)
    expect(updates).toContainEqual({ row: 1, col: 0, value: 'A' })
    expect(updates).toContainEqual({ row: 2, col: 1, value: 'B' })
  })

  it('fillRight copies left column into columns to the right', () => {
    const range = { startRow: 0, endRow: 2, startCol: 0, endCol: 2 }
    const updates = fillRightRange(range, getValue)
    expect(updates).toContainEqual({ row: 0, col: 2, value: 'A' })
    expect(updates).toContainEqual({ row: 2, col: 1, value: 'D' })
  })

  it('clearRangeCells returns empty values for each cell', () => {
    const range = { startRow: 0, endRow: 1, startCol: 0, endCol: 0 }
    expect(clearRangeCells(range)).toEqual([
      { row: 0, col: 0, value: '' },
      { row: 1, col: 0, value: '' },
    ])
  })

  it('findEdgeInDirection jumps within contiguous data', () => {
    expect(findEdgeInDirection(1, 1, 'right', 2, 2, getValue)).toEqual({
      rowIndex: 1,
      colIndex: 1,
    })
    expect(findEdgeInDirection(0, 0, 'right', 2, 2, getValue)).toEqual({
      rowIndex: 0,
      colIndex: 1,
    })
  })

  it('findLastUsedCell returns bottom-rightmost non-empty', () => {
    expect(findLastUsedCell(2, 2, getValue)).toEqual({ rowIndex: 2, colIndex: 0 })
  })

  it('cellInRange and rangesEqual', () => {
    const range = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 }
    expect(cellInRange(range, 1, 1)).toBe(true)
    expect(cellInRange(range, 2, 0)).toBe(false)
    expect(rangesEqual(range, { ...range })).toBe(true)
    expect(rangesEqual(range, { ...range, endRow: 2 })).toBe(false)
  })

  it('translateRange clamps the full block in-bounds', () => {
    const source = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 }
    expect(translateRange(source, 1, 0, 2, 2)).toEqual({
      startRow: 1,
      endRow: 2,
      startCol: 0,
      endCol: 1,
    })
    expect(translateRange(source, 10, 10, 2, 2)).toEqual({
      startRow: 1,
      endRow: 2,
      startCol: 1,
      endCol: 2,
    })
  })

  it('copyRangeUpdates writes dest from source snapshot', () => {
    const source = { startRow: 0, endRow: 0, startCol: 0, endCol: 1 }
    const dest = { startRow: 2, endRow: 2, startCol: 0, endCol: 1 }
    expect(copyRangeUpdates(source, dest, getValue)).toEqual([
      { row: 2, col: 0, value: 'A' },
      { row: 2, col: 1, value: 'B' },
    ])
  })

  it('moveRangeUpdates is a no-op when source equals dest', () => {
    const range = { startRow: 0, endRow: 0, startCol: 0, endCol: 0 }
    expect(moveRangeUpdates(range, range, getValue)).toEqual([])
  })

  it('moveRangeUpdates clears vacated cells on non-overlapping move', () => {
    const source = { startRow: 0, endRow: 0, startCol: 0, endCol: 1 }
    const dest = { startRow: 2, endRow: 2, startCol: 0, endCol: 1 }
    const updates = moveRangeUpdates(source, dest, getValue)
    expect(updates).toContainEqual({ row: 2, col: 0, value: 'A' })
    expect(updates).toContainEqual({ row: 2, col: 1, value: 'B' })
    expect(updates).toContainEqual({ row: 0, col: 0, value: '' })
    expect(updates).toContainEqual({ row: 0, col: 1, value: '' })
  })

  it('moveRangeUpdates handles vertical shift-by-1 overlap', () => {
    // Simulate rows 0-1 moving down one: A,B / '',C → row1 gets A,B; row0 cleared; row2 gets '',C
    const source = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 }
    const dest = { startRow: 1, endRow: 2, startCol: 0, endCol: 1 }
    const updates = moveRangeUpdates(source, dest, getValue)
    expect(updates).toContainEqual({ row: 1, col: 0, value: 'A' })
    expect(updates).toContainEqual({ row: 1, col: 1, value: 'B' })
    expect(updates).toContainEqual({ row: 2, col: 0, value: '' })
    expect(updates).toContainEqual({ row: 2, col: 1, value: 'C' })
    expect(updates).toContainEqual({ row: 0, col: 0, value: '' })
    expect(updates).toContainEqual({ row: 0, col: 1, value: '' })
    // Overlapping cell (1,0)/(1,1) must not be cleared after write
    expect(updates.filter((u) => u.row === 1 && u.col === 0 && u.value === '')).toHaveLength(0)
  })

  it('moveRangeUpdates handles horizontal shift-by-1 overlap', () => {
    const source = { startRow: 0, endRow: 0, startCol: 0, endCol: 1 }
    const dest = { startRow: 0, endRow: 0, startCol: 1, endCol: 2 }
    const updates = moveRangeUpdates(source, dest, getValue)
    expect(updates).toContainEqual({ row: 0, col: 1, value: 'A' })
    expect(updates).toContainEqual({ row: 0, col: 2, value: 'B' })
    expect(updates).toContainEqual({ row: 0, col: 0, value: '' })
    expect(updates.filter((u) => u.row === 0 && u.col === 1 && u.value === '')).toHaveLength(0)
  })
})
