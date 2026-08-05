import { describe, it, expect } from 'vitest'
import {
  mergePrimaryAndRescueRows,
  mergeRowsByIndex,
} from '../../server/utils/digifiScanMerge'

describe('mergeRowsByIndex', () => {
  it('keeps distinct rowIndex values separate and does not join remarks', () => {
    const { rows, duplicateRowIndices } = mergeRowsByIndex([
      { rowIndex: 0, cells: { total: '1.3', remarks: 'Braden Korte | Checkride Prep' } },
      { rowIndex: 1, cells: { total: '1.3', remarks: 'Chance Fry Holds WERBU UDOMY' } },
      { rowIndex: 2, cells: { total: '1.3', remarks: 'Braden Korte Checkride Prep' } },
    ])
    expect(duplicateRowIndices).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.rowIndex)).toEqual([0, 1, 2])
    expect(rows[0].cells.remarks).toBe('Braden Korte | Checkride Prep')
    expect(rows[1].cells.remarks).toBe('Chance Fry Holds WERBU UDOMY')
    expect(rows[2].cells.remarks).toBe('Braden Korte Checkride Prep')
  })

  it('fills empty cells on duplicate rowIndex without joining existing remarks', () => {
    const { rows, duplicateRowIndices } = mergeRowsByIndex([
      { rowIndex: 0, cells: { remarks: 'first flight', total: '1.3' } },
      { rowIndex: 0, cells: { remarks: 'should not replace', pic: '1.3' } },
    ])
    expect(duplicateRowIndices).toEqual([0])
    expect(rows).toHaveLength(1)
    expect(rows[0].cells.remarks).toBe('first flight')
    expect(rows[0].cells.total).toBe('1.3')
    expect(rows[0].cells.pic).toBe('1.3')
  })
})

describe('mergePrimaryAndRescueRows', () => {
  it('adds missing rescue rows without merging remarks across indices', () => {
    const merged = mergePrimaryAndRescueRows(
      [{ rowIndex: 0, cells: { remarks: 'A', total: '1.3' } }],
      [
        { rowIndex: 1, cells: { remarks: 'B', total: '1.3' } },
        { rowIndex: 0, cells: { remarks: 'ignored', pic: '1.3' } },
      ]
    )
    expect(merged).toHaveLength(2)
    expect(merged[0].cells.remarks).toBe('A')
    expect(merged[0].cells.pic).toBe('1.3')
    expect(merged[1].cells.remarks).toBe('B')
  })
})
