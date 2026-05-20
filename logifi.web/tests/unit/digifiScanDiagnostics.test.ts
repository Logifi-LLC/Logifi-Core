import { describe, it, expect } from 'vitest'
import {
  analyzeDigifiScanRows,
  formatDigifiScanWarning,
} from '../../app/utils/digifiScanDiagnostics'

describe('digifiScanDiagnostics', () => {
  it('detects missing row indices', () => {
    const d = analyzeDigifiScanRows(
      [
        { rowIndex: 0, cells: { a: '1' } },
        { rowIndex: 2, cells: { a: '2' } },
      ],
      3
    )
    expect(d.rowsReturned).toBe(2)
    expect(d.missingRowIndices).toEqual([1])
    expect(d.hasGaps).toBe(true)
  })

  it('returns null warning when all rows present', () => {
    const d = analyzeDigifiScanRows(
      [
        { rowIndex: 0, cells: {} },
        { rowIndex: 1, cells: {} },
      ],
      2
    )
    expect(formatDigifiScanWarning(d, 2)).toBeNull()
  })

  it('warns when fewer rows than expected', () => {
    const d = analyzeDigifiScanRows([{ rowIndex: 0, cells: {} }], 13)
    const msg = formatDigifiScanWarning(d, 13)
    expect(msg).toContain('Expected 13')
    expect(msg).toContain('1')
  })
})
