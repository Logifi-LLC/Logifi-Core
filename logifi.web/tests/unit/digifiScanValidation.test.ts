import { describe, it, expect } from 'vitest'
import { computeDigifiMaxOutputTokens } from '../../server/utils/digifiEnv'
import {
  countRowsWithCells,
  isScanResponseIncomplete,
} from '../../server/utils/digifiScanValidation'

describe('computeDigifiMaxOutputTokens', () => {
  it('scales with row and column count up to cap', () => {
    expect(computeDigifiMaxOutputTokens(13, 10, 20_000)).toBe(8192)
    expect(computeDigifiMaxOutputTokens(40, 15, 20_000)).toBe(
      Math.min(20_000, 1024 + 40 * 15 * 12)
    )
  })

  it('never goes below 8192', () => {
    expect(computeDigifiMaxOutputTokens(1, 1, 20_000)).toBe(8192)
  })
})

describe('isScanResponseIncomplete', () => {
  it('flags when fewer than half of expected rows have cells', () => {
    const rows = [
      { rowIndex: 0, cells: { c1: 'x' } },
      { rowIndex: 1, cells: { c1: 'y' } },
    ]
    expect(isScanResponseIncomplete(rows, 13)).toBe(true)
    expect(countRowsWithCells(rows)).toBe(2)
  })

  it('passes when enough rows have cells', () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({
      rowIndex: i,
      cells: { c1: 'v' },
    }))
    expect(isScanResponseIncomplete(rows, 13)).toBe(false)
  })
})
