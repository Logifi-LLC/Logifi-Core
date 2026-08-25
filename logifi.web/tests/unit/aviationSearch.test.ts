import { describe, expect, it } from 'vitest'
import {
  entryMatchesAviationSearch,
  parseAviationSearch,
  stripSearchToken,
} from '../../app/utils/aviationSearch'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
  type LogEntry,
} from '../../app/utils/logbookTypes'

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: '1',
    date: '2026-03-15',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N17XX',
    flightNumber: 'AA100',
    departure: 'KATL',
    destination: 'KORD',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: 'smooth',
    tags: ['Checkride'],
    logbookType: 'flight',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    ...overrides,
  }
}

describe('parseAviationSearch', () => {
  it('classifies N17XX ATL 3/15 into tail, airport, and date chips', () => {
    const parsed = parseAviationSearch('N17XX ATL 3/15')
    expect(parsed.tokens.map((t) => t.kind)).toEqual(['tail', 'airport', 'date'])
    expect(parsed.tokens[1].value).toBe('KATL')
    expect(parsed.chips.map((c) => c.label)).toEqual(['N17XX', 'ATL', '3/15'])
  })

  it('keeps unknown 3-letter tokens like PIC as text', () => {
    const parsed = parseAviationSearch('PIC')
    expect(parsed.tokens).toHaveLength(1)
    expect(parsed.tokens[0].kind).toBe('text')
  })

  it('classifies known logbook tails that are not N-numbers', () => {
    const parsed = parseAviationSearch('G-ABCD', {
      knownTails: new Set(['G-ABCD', 'GABCD']),
    })
    expect(parsed.tokens[0].kind).toBe('tail')
  })

  it('parses YYYY-MM-DD and M/D/YYYY dates', () => {
    expect(parseAviationSearch('2026-03-15').tokens[0]).toMatchObject({
      kind: 'date',
      value: '2026-03-15',
    })
    expect(parseAviationSearch('3/15/2026').tokens[0]).toMatchObject({
      kind: 'date',
      value: '2026-03-15',
    })
  })
})

describe('stripSearchToken', () => {
  it('removes the dismissed chip token', () => {
    expect(stripSearchToken('N17XX ATL 3/15', 'ATL')).toBe('N17XX 3/15')
  })
})

describe('entryMatchesAviationSearch', () => {
  it('ANDs different types so N17XX ATL 3/15 must all match', () => {
    const parsed = parseAviationSearch('N17XX ATL 3/15')
    expect(entryMatchesAviationSearch(entry(), parsed)).toBe(true)
    expect(
      entryMatchesAviationSearch(entry({ registration: 'N99999' }), parsed)
    ).toBe(false)
    expect(
      entryMatchesAviationSearch(entry({ departure: 'KJFK', destination: 'KLGA' }), parsed)
    ).toBe(false)
    expect(entryMatchesAviationSearch(entry({ date: '2026-04-01' }), parsed)).toBe(
      false
    )
  })

  it('ORs same-type tokens', () => {
    const parsed = parseAviationSearch('N17XX N99999')
    expect(entryMatchesAviationSearch(entry(), parsed)).toBe(true)
    expect(
      entryMatchesAviationSearch(entry({ registration: 'N99999' }), parsed)
    ).toBe(true)
    expect(
      entryMatchesAviationSearch(entry({ registration: 'N11111' }), parsed)
    ).toBe(false)
  })

  it('matches M/D against any year', () => {
    const parsed = parseAviationSearch('3/15')
    expect(entryMatchesAviationSearch(entry({ date: '2024-03-15' }), parsed)).toBe(
      true
    )
    expect(entryMatchesAviationSearch(entry({ date: '2024-03-16' }), parsed)).toBe(
      false
    )
  })

  it('ANDs leftover text against blob, date, flight number, and tags', () => {
    const parsed = parseAviationSearch('smooth Checkride AA100')
    expect(parsed.tokens.every((t) => t.kind === 'text')).toBe(true)
    expect(entryMatchesAviationSearch(entry(), parsed)).toBe(true)
    expect(entryMatchesAviationSearch(entry({ remarks: '' }), parsed)).toBe(false)
  })

  it('matches ATL to KATL via airport codes', () => {
    const parsed = parseAviationSearch('ATL')
    expect(entryMatchesAviationSearch(entry({ departure: 'KATL' }), parsed)).toBe(
      true
    )
    expect(
      entryMatchesAviationSearch(
        entry({ departure: '', destination: '', route: 'KATL' }),
        parsed,
        new Set(['KATL'])
      )
    ).toBe(true)
  })
})
