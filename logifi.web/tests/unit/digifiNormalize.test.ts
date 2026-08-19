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

  it('preserves correct From Route To when each column has one code', () => {
    const rows = normalizeScanRows(
      [{ rowIndex: 0, cells: { from: 'KLAF', route: 'KFKR', to: 'KLAF' } }],
      [
        { id: 'from', label: 'From', fieldKey: 'departure', order: 0 },
        { id: 'route', label: 'Route', fieldKey: 'route', order: 1 },
        { id: 'to', label: 'To', fieldKey: 'destination', order: 2 },
      ],
      2024
    )
    expect(rows[0].cells.from).toBe('KLAF')
    expect(rows[0].cells.route).toBe('KFKR')
    expect(rows[0].cells.to).toBe('KLAF')
  })

  it('fixes misread when route duplicates from and stop is in to', () => {
    const rows = normalizeScanRows(
      [{ rowIndex: 0, cells: { from: 'KLAF', route: 'KLAF', to: 'KFKR' } }],
      [
        { id: 'from', label: 'From', fieldKey: 'departure', order: 0 },
        { id: 'route', label: 'Route', fieldKey: 'route', order: 1 },
        { id: 'to', label: 'To', fieldKey: 'destination', order: 2 },
      ],
      2024
    )
    expect(rows[0].cells.from).toBe('KLAF')
    expect(rows[0].cells.route).toBe('KFKR')
    expect(rows[0].cells.to).toBe('KLAF')
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

  it('normalizes remarks: literal \\n and newlines become pipe separators', () => {
    expect(normalizeCellValue('McCaffrey\\nCheckride', 'remarks', 2024)).toBe('McCaffrey | Checkride')
    expect(normalizeCellValue('line1\nline2', 'remarks', 2024)).toBe('line1 | line2')
    expect(normalizeCellValue('a\\r\\nb', 'remarks', 2024)).toBe('a | b')
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

describe('normalizeScanRows year rollover', () => {
  const dateOnlyColumns = [{ id: 'dt', label: 'Date', fieldKey: 'date' as const, order: 0 }]

  it('January row after December row gets defaultYear + 1', () => {
    const rows = normalizeScanRows(
      [
        { rowIndex: 0, cells: { dt: '12/28' } },
        { rowIndex: 1, cells: { dt: '12/31' } },
        { rowIndex: 2, cells: { dt: '1/5' } },
      ],
      dateOnlyColumns,
      2022
    )
    expect(rows[0].cells.dt).toBe('2022-12-28')
    expect(rows[1].cells.dt).toBe('2022-12-31')
    expect(rows[2].cells.dt).toBe('2023-01-05')
  })

  it('January row with no prior date gets defaultYear (no rollover)', () => {
    const rows = normalizeScanRows(
      [{ rowIndex: 0, cells: { dt: '1/5' } }],
      dateOnlyColumns,
      2023
    )
    expect(rows[0].cells.dt).toBe('2023-01-05')
  })

  it('full four-digit year in date is never overridden by rollover', () => {
    const rows = normalizeScanRows(
      [
        { rowIndex: 0, cells: { dt: '12/31' } },
        { rowIndex: 1, cells: { dt: '1/5/2023' } },
      ],
      dateOnlyColumns,
      2022
    )
    expect(rows[0].cells.dt).toBe('2022-12-31')
    expect(rows[1].cells.dt).toBe('2023-01-05')
  })
})
