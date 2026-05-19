import { describe, it, expect } from 'vitest'
import { normalizeCellValue, normalizeScanRows } from '../../server/utils/digifiNormalize'

describe('digifiNormalize', () => {
  it('normalizes decimal times', () => {
    expect(normalizeCellValue('1.5', 'pic', 2024)).toBe('1.5')
    expect(normalizeCellValue('$2.3', 'total', 2024)).toBe('2.3')
  })

  it('normalizes airport codes', () => {
    expect(normalizeCellValue('kord', 'departure', 2024)).toBe('KORD')
  })

  it('normalizes MM/DD dates with default year', () => {
    expect(normalizeCellValue('3/15', 'date', 2024)).toBe('2024-03-15')
  })

  it('normalizes scan rows by column field', () => {
    const rows = normalizeScanRows(
      [{ rowIndex: 0, cells: { c1: ' kord ', c2: '1.2' } }],
      [
        { id: 'c1', label: 'From', fieldKey: 'departure', order: 0 },
        { id: 'c2', label: 'PIC', fieldKey: 'pic', order: 1 },
      ],
      2024
    )
    expect(rows[0].cells.c1).toBe('KORD')
    expect(rows[0].cells.c2).toBe('1.2')
  })
})
