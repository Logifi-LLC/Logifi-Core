import { describe, expect, it } from 'vitest'
import {
  entryMatchesAviationQuery,
  parseAviationSearchQuery,
  removeQueryToken,
} from '../aviationSearchQuery'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'e1',
    date: '2024-06-15',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: 1.2,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KORD',
    destination: 'KMDW',
    route: 'KARR',
    trainingElements: 'Jane Smith',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: ['nightVfr'],
    remarks: 'Night dual',
    flightTime: { ...createEmptyFlightTime(), total: 1.2, night: 0.8 },
    performance: { ...createEmptyPerformance(), nightLandings: 2 },
    ...overrides,
  }
}

describe('parseAviationSearchQuery', () => {
  it('classifies tail, ICAO, month, night, and crew text', () => {
    const parsed = parseAviationSearchQuery('N12345 KORD 2024-06 night Smith')
    expect(parsed.tokens.map((t) => t.kind)).toEqual([
      'tail',
      'airport',
      'date',
      'condition',
      'text',
    ])
    expect(parsed.chips.map((c) => c.label)).toEqual([
      'Tail N12345',
      'Airport KORD',
      'Date 2024-06',
      'Night',
      'Smith',
    ])
  })

  it('treats a bare US tail as an N-number', () => {
    const parsed = parseAviationSearchQuery('12345')
    expect(parsed.tokens[0]).toMatchObject({ kind: 'tail', value: 'N12345' })
  })

  it('classifies a four-digit year as a date, not a tail', () => {
    const parsed = parseAviationSearchQuery('2024')
    expect(parsed.tokens[0]).toMatchObject({ kind: 'date', value: '2024' })
  })

  it('classifies IATA airport codes', () => {
    const parsed = parseAviationSearchQuery('ORD')
    expect(parsed.tokens[0]).toMatchObject({ kind: 'airport', value: 'ORD' })
  })

  it('removes a chip token by index', () => {
    expect(removeQueryToken('N12345 KORD night', 1)).toBe('N12345 night')
  })
})

describe('entryMatchesAviationQuery', () => {
  const classified = new Set(['KARR'])

  it('matches all AND tokens together', () => {
    const parsed = parseAviationSearchQuery('N12345 KORD 2024-06 night Smith')
    expect(entryMatchesAviationQuery(entry(), parsed, classified)).toBe(true)
  })

  it('rejects a mismatched tail', () => {
    const parsed = parseAviationSearchQuery('N99999')
    expect(entryMatchesAviationQuery(entry(), parsed, classified)).toBe(false)
  })

  it('matches IATA ORD to ICAO KORD', () => {
    const parsed = parseAviationSearchQuery('ORD')
    expect(entryMatchesAviationQuery(entry(), parsed, classified)).toBe(true)
  })

  it('matches YYYY-MM against the entry date prefix', () => {
    const parsed = parseAviationSearchQuery('2024-06')
    expect(entryMatchesAviationQuery(entry({ date: '2024-06-15' }), parsed)).toBe(true)
    expect(entryMatchesAviationQuery(entry({ date: '2024-07-01' }), parsed)).toBe(false)
  })

  it('matches night via condition or night time', () => {
    const parsed = parseAviationSearchQuery('night')
    expect(entryMatchesAviationQuery(entry({ flightConditions: [] }), parsed)).toBe(true)
    expect(
      entryMatchesAviationQuery(
        entry({
          flightConditions: [],
          flightTime: { ...createEmptyFlightTime(), night: 0 },
          performance: createEmptyPerformance(),
        }),
        parsed
      )
    ).toBe(false)
  })

  it('matches crew names as leftover text', () => {
    const parsed = parseAviationSearchQuery('Smith')
    expect(entryMatchesAviationQuery(entry(), parsed)).toBe(true)
    expect(entryMatchesAviationQuery(entry({ trainingElements: 'Bob Jones' }), parsed)).toBe(false)
  })

  it('matches C172 as aircraft text rather than an airport', () => {
    const parsed = parseAviationSearchQuery('C172')
    expect(parsed.tokens[0].kind).toBe('text')
    expect(entryMatchesAviationQuery(entry(), parsed)).toBe(true)
  })

  it('returns true for an empty query', () => {
    expect(entryMatchesAviationQuery(entry(), parseAviationSearchQuery(''))).toBe(true)
  })
})
