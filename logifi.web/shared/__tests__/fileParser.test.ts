import { describe, expect, it } from 'vitest'
import { parseBridgeFile, parseCSVLine, parseCSVRecords } from '../logbookDataBridge/fileParser'

describe('RFC 4180 CSV parsing', () => {
  it('keeps quoted newlines inside a single row', () => {
    const csv = [
      'Date,Registration,Remarks,Total Flight Time',
      '08/15/2025,N9900F,"Line one',
      'Line two",1.2',
    ].join('\n')

    const parsed = parseBridgeFile(csv, 'logifi-native')
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]?.Remarks).toBe('Line one\nLine two')
    expect(parsed.rows[0]?.['Total Flight Time']).toBe('1.2')
    expect(parsed.rows[0]?.Registration).toBe('N9900F')
  })

  it('keeps a leading quote that is part of the field', () => {
    expect(parseCSVLine('"""Bat"" callsign"')[0]).toBe('"Bat" callsign')
    const csv = 'Date,Remarks\n08/15/2025,"""Bat"" callsign"\n'
    const parsed = parseBridgeFile(csv)
    expect(parsed.rows[0]?.Remarks).toBe('"Bat" callsign')
  })

  it('does not strip a leftover leading quote after parsing', () => {
    const records = parseCSVRecords('"Hello, world",N9900F')
    expect(records[0]).toEqual(['Hello, world', 'N9900F'])
  })
})
