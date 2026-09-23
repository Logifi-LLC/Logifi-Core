import { describe, it, expect } from 'vitest'
import { sanitizeDigifiScanRows } from '../../app/utils/digifiScanSanitize'
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

  it('strips last-row dualG page total when it matches column sum even with OCR date', () => {
    const dualOnly: DigifiTemplateColumn[] = [
      { id: 'dualg', label: 'Dual G', fieldKey: 'dualG', order: 0 },
      { id: 'date', label: 'Date', fieldKey: 'date', order: 1 },
      { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 2 },
    ]
    const dualTimes = [1.4, 1.3, 1.7, 1.5, 0.7, 1.8, 1.3, 1.4, 1.2, 1.6, 1.1, 1.3]
    const rows = dualTimes.map((dualg, rowIndex) => ({
      rowIndex,
      cells: { dualg: String(dualg) },
    }))
    const sum = dualTimes.reduce((a, b) => a + b, 0)
    rows.push({
      rowIndex: 12,
      cells: { dualg: sum.toFixed(1), date: '1/31', remarks: 'Bumpy' },
    })

    const { rows: kept, footerOutlierRowIndex } = sanitizeDigifiScanRows(rows, dualOnly, 13)
    expect(footerOutlierRowIndex).toBe(12)
    expect(kept).toHaveLength(12)
  })

  it('strips last-row dualG page total outlier', () => {
    const dualOnly: DigifiTemplateColumn[] = [
      { id: 'dualg', label: 'Dual G', fieldKey: 'dualG', order: 0 },
    ]
    const rows = Array.from({ length: 12 }, (_, rowIndex) => ({
      rowIndex,
      cells: { dualg: '1.2' },
    }))
    rows.push({ rowIndex: 12, cells: { dualg: '17.2' } })

    const { rows: kept, strippedRowIndices, footerOutlierRowIndex } = sanitizeDigifiScanRows(
      rows,
      dualOnly,
      13
    )
    expect(footerOutlierRowIndex).toBe(12)
    expect(strippedRowIndices).toContain(12)
    expect(kept).toHaveLength(12)
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
