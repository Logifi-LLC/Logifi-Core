import { describe, expect, it } from 'vitest'
import {
  countRemarksPipes,
  detectPageFooterOutlierRowIndex,
  findRemarksMergeSuspects,
} from '../../app/utils/digifiScanRowReview'
import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'

const dualGPage: DigifiTemplateColumn[] = [
  { id: 'dualg', label: 'Dual G', fieldKey: 'dualG', order: 0 },
  { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 1 },
]

describe('detectPageFooterOutlierRowIndex', () => {
  it('flags a last-row page total like 17.2 Dual G on a 0.6–1.8 page', () => {
    const rows = Array.from({ length: 12 }, (_, rowIndex) => ({
      rowIndex,
      cells: { dualg: String(1 + (rowIndex % 5) * 0.1) },
    }))
    rows.push({ rowIndex: 12, cells: { dualg: '17.2', remarks: 'Bundy' } })

    expect(detectPageFooterOutlierRowIndex(rows, dualGPage, 13)).toBe(12)
  })

  it('keeps a normal last flight line', () => {
    const rows = Array.from({ length: 13 }, (_, rowIndex) => ({
      rowIndex,
      cells: { dualg: '1.2' },
    }))
    expect(detectPageFooterOutlierRowIndex(rows, dualGPage, 13)).toBeNull()
  })
})

describe('findRemarksMergeSuspects', () => {
  it('uses page-relative pipe counts, not a global threshold', () => {
    const columns: DigifiTemplateColumn[] = [
      { id: 'pic', label: 'PIC', fieldKey: 'pic', order: 0 },
      { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 1 },
    ]
    const rows = [
      { rowIndex: 0, cells: { pic: '1.0', remarks: 'a | b' } },
      { rowIndex: 1, cells: { pic: '1.5', remarks: 'c | d' } },
      {
        rowIndex: 2,
        cells: {
          pic: '1.0',
          remarks: 'one | two | three | four | five',
        },
      },
    ]
    const suspects = findRemarksMergeSuspects(rows, columns, 3)
    expect(suspects.some((s) => s.rowIndex === 2)).toBe(true)
    expect(suspects.some((s) => s.rowIndex === 0)).toBe(false)
  })
})

describe('countRemarksPipes', () => {
  it('counts pipe separators', () => {
    expect(countRemarksPipes('a | b | c')).toBe(2)
    expect(countRemarksPipes('single')).toBe(0)
  })
})
