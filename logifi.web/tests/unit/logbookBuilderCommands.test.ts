import { describe, it, expect } from 'vitest'
import {
  buildValuesMatrix,
  clearRangeCells,
  fillDownRange,
  fillRightRange,
  findEdgeInDirection,
  findLastUsedCell,
  matrixToTsv,
  normalizeSelectionRange,
  parseTsvMatrix,
  selectionOrActive,
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
})
