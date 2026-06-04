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

  it('adds early-gap hint when top rows are missing', () => {
    const d = analyzeDigifiScanRows(
      [
        { rowIndex: 0, cells: { a: '1' } },
        { rowIndex: 3, cells: { a: '2' } },
      ],
      5
    )
    const msg = formatDigifiScanWarning(d, 5)
    expect(msg).toContain('Missing row line(s)')
    expect(msg).toContain('shifted up')
  })

  it('tracks duplicate and empty rows', () => {
    const d = analyzeDigifiScanRows(
      [
        { rowIndex: 0, cells: { a: '1' } },
        { rowIndex: 0, cells: { a: '' } },
        { rowIndex: 1, cells: { a: '' } },
      ],
      2
    )
    expect(d.duplicateRowIndices).toEqual([0])
    expect(d.emptyRowIndices).toEqual([1])
    expect(formatDigifiScanWarning(d, 2)).toContain('read more than once')
  })
})
