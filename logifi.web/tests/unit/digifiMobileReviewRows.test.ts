import { describe, expect, it } from 'vitest'
import { computeDigifiMobileReviewRowMinHeights } from '~/utils/digifiMobileReviewRows'

describe('computeDigifiMobileReviewRowMinHeights', () => {
  it('uses the same height for every column at a row index (remarks + rescan reserve)', () => {
    const heights = computeDigifiMobileReviewRowMinHeights({
      rowCount: 3,
      rows: [
        { cells: { dualg: '1.4', remarks: 'Short' } },
        { cells: { dualg: '1.3', remarks: 'Line one | Line two | Line three' } },
        { cells: { dualg: '17.2', remarks: 'Bumpy' } },
      ],
      columns: [
        { id: 'dualg', fieldKey: 'dualG' },
        { id: 'remarks', fieldKey: 'remarks' },
      ],
      remarksRescanRowIndices: new Set([2]),
    })

    expect(heights).toHaveLength(3)
    expect(heights[0]).toBeLessThan(heights[1])
    expect(heights[2]).toBeGreaterThan(heights[0])
    expect(heights[1]).toBe(heights[1])
  })

  it('keeps numeric-only rows at the base height', () => {
    const heights = computeDigifiMobileReviewRowMinHeights({
      rowCount: 2,
      rows: [{ cells: { dualg: '1.2' } }, { cells: { dualg: '1.3' } }],
      columns: [{ id: 'dualg', fieldKey: 'dualG' }],
    })
    expect(heights).toEqual([28, 28])
  })
})
