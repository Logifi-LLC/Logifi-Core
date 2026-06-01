import { describe, it, expect } from 'vitest'
import {
  normalizeCellValue,
  normalizeScanRows,
  splitAirportCodes,
} from '../../server/utils/digifiNormalize'

describe('digifiNormalize', () => {
  it('normalizes decimal times', () => {
    expect(normalizeCellValue('1.5', 'pic', 2024)).toBe('1.5')
    expect(normalizeCellValue('$2.3', 'total', 2024)).toBe('2.3')
  })

  it('normalizes airport codes', () => {
    expect(normalizeCellValue('kord', 'departure', 2024)).toBe('KORD')
  })

  it('splitAirportCodes extracts ICAO tokens', () => {
    expect(splitAirportCodes('KLAF - KFKR - KLAF')).toEqual(['KLAF', 'KFKR', 'KLAF'])
    expect(splitAirportCodes('KFKR KLAF')).toEqual(['KFKR', 'KLAF'])
  })

  it('uses first code for departure and last for destination in one cell', () => {
    expect(normalizeCellValue('KFKR KLAF', 'departure', 2024)).toBe('KFKR')
    expect(normalizeCellValue('KFKR KLAF', 'destination', 2024)).toBe('KLAF')
  })

  it('reconciles multi-stop routes to first/last From-To with middle in Route', () => {
    const rows = normalizeScanRows(
      [{
        rowIndex: 0,
        cells: { from: 'KLAF', to: 'KFKR KLAF', route: '' },
      }],
      [
        { id: 'from', label: 'From', fieldKey: 'departure', order: 0 },
        { id: 'to', label: 'To', fieldKey: 'destination', order: 1 },
        { id: 'route', label: 'Route', fieldKey: 'route', order: 2 },
      ],
      2024
    )
    expect(rows[0].cells.from).toBe('KLAF')
    expect(rows[0].cells.to).toBe('KLAF')
    expect(rows[0].cells.route).toBe('KFKR')
  })

  it('drops intermediate stops when no route column exists', () => {
    const rows = normalizeScanRows(
      [{ rowIndex: 0, cells: { from: 'KLAF', to: 'KFKR KLAF' } }],
      [
        { id: 'from', label: 'From', fieldKey: 'departure', order: 0 },
        { id: 'to', label: 'To', fieldKey: 'destination', order: 1 },
      ],
      2024
    )
    expect(rows[0].cells.from).toBe('KLAF')
    expect(rows[0].cells.to).toBe('KLAF')
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
