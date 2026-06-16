import { describe, it, expect } from 'vitest'
import { sanitizeDigifiScanRows } from '../../server/utils/digifiScanSanitize'
import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'

const timeColumns: DigifiTemplateColumn[] = [
  { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 0 },
  { id: 'sic', label: 'SIC', fieldKey: 'sic', order: 1 },
  { id: 'night', label: 'Night', fieldKey: 'night', order: 2 },
  { id: 'xc', label: 'XC', fieldKey: 'xc', order: 3 },
  { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 4 },
]

describe('sanitizeDigifiScanRows', () => {
  it('strips rows with totals keywords', () => {
    const { rows, strippedRowIndices } = sanitizeDigifiScanRows(
      [
        {
          rowIndex: 12,
          cells: { remarks: 'Page Total carried forward' },
        },
      ],
      timeColumns,
      13
    )
    expect(rows).toHaveLength(0)
    expect(strippedRowIndices).toEqual([12])
  })

  it('strips totals-shaped numeric rows with large cumulative values', () => {
    const { rows, strippedRowIndices } = sanitizeDigifiScanRows(
      [
        {
          rowIndex: 12,
          cells: {
            pic: '45.2',
            sic: '12.0',
            night: '8.5',
            xc: '120.3',
          },
        },
      ],
      timeColumns,
      13
    )
    expect(rows).toHaveLength(0)
    expect(strippedRowIndices).toEqual([12])
  })

  it('keeps normal single-flight rows', () => {
    const { rows, strippedRowIndices } = sanitizeDigifiScanRows(
      [
        {
          rowIndex: 3,
          cells: {
            pic: '1.5',
            night: '0.5',
            remarks: 'Pattern work | KORD',
          },
        },
      ],
      timeColumns,
      13
    )
    expect(rows).toHaveLength(1)
    expect(strippedRowIndices).toEqual([])
    expect(rows[0].cells.pic).toBe('1.5')
  })

  it('drops overflow rowIndex values', () => {
    const { rows, strippedRowIndices } = sanitizeDigifiScanRows(
      [{ rowIndex: 15, cells: { pic: '2.0' } }],
      timeColumns,
      13
    )
    expect(rows).toHaveLength(0)
    expect(strippedRowIndices).toEqual([])
  })
})
