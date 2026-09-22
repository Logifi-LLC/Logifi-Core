import { describe, expect, it } from 'vitest'
import { normalizeDigifiRemarksCell } from '../../app/utils/digifiRemarksNormalize'
import { findRemarksMergeSuspects } from '../../app/utils/digifiScanRowReview'
import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'

describe('normalizeDigifiRemarksCell', () => {
  it('collapses large mid-string gaps from OCR', () => {
    expect(normalizeDigifiRemarksCell('Lesson 4V    Lesson 5X')).toBe('Lesson 4V Lesson 5X')
  })
})

describe('findRemarksMergeSuspects spacing', () => {
  it('flags remarks with abnormal whitespace', () => {
    const columns: DigifiTemplateColumn[] = [
      { id: 'remarks', label: 'Remarks', fieldKey: 'remarks', order: 0 },
    ]
    const suspects = findRemarksMergeSuspects(
      [{ rowIndex: 6, cells: { remarks: 'Aaron | Lesson 4V     Lesson 5X' } }],
      columns,
      13
    )
    expect(suspects.some((s) => s.rowIndex === 6)).toBe(true)
  })
})
