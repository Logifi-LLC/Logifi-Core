import { describe, expect, it } from 'vitest'
import {
  computeDigifiMobileReviewRowMinHeights,
  mergeDigifiMobileReviewRowHeights,
} from '~/utils/digifiMobileReviewRows'

describe('computeDigifiMobileReviewRowMinHeights', () => {
  it('uses remarks line count for row height and does not reserve rescan space', () => {
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
    })

    expect(heights).toHaveLength(3)
    expect(heights[0]).toBeLessThan(heights[1])
    expect(heights[2]).toBe(heights[0])
  })

  it('keeps numeric-only rows at the base height', () => {
    const heights = computeDigifiMobileReviewRowMinHeights({
      rowCount: 2,
      rows: [{ cells: { dualg: '1.2' } }, { cells: { dualg: '1.3' } }],
      columns: [{ id: 'dualg', fieldKey: 'dualG' }],
    })
    expect(heights).toEqual([28, 28])
  })

  it('mergeDigifiMobileReviewRowHeights takes the max of measure and floor per row', () => {
    const merged = mergeDigifiMobileReviewRowHeights(2, [40, 28], [28, 52])
    expect(merged).toEqual([40, 52])
  })
})
