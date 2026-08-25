import { describe, expect, it } from 'vitest'
import {
  formatEntryAirportCode,
  getEntryFieldDisplay,
  getTotalTimeColorClass,
} from '../entryFieldDisplay'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
  type LogEntry,
} from '../logbookTypes'

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id',
    date: '2026-08-12',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane MEL',
    categoryClassTime: null,
    aircraftMakeModel: 'E175',
    registration: 'N421YX',
    flightNumber: '4442',
    departure: 'RIC',
    destination: 'LGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: ['ifr'],
    remarks: '',
    tags: [],
    logbookType: 'flight',
    flightTime: { ...createEmptyFlightTime(), total: 1.3 },
    performance: createEmptyPerformance(),
    flagged: false,
    isImported: true,
    importSource: 'flica_aerodatabox',
    ...overrides,
  }
}

describe('getTotalTimeColorClass', () => {
  it('uses amber for FLICA schedule imports', () => {
    expect(getTotalTimeColorClass(entry(), false)).toBe('text-amber-600')
    expect(getTotalTimeColorClass(entry(), true)).toBe('text-amber-400')
  })

  it('uses amber for FC View imports', () => {
    expect(
      getTotalTimeColorClass(entry({ importSource: 'fc_view' }), false)
    ).toBe('text-amber-600')
  })

  it('uses red for other imported sources', () => {
    expect(
      getTotalTimeColorClass(entry({ importSource: 'csv' }), false)
    ).toBe('text-red-600')
  })
})

describe('formatEntryAirportCode', () => {
  it('maps FLICA IATA codes to catalog ICAO', () => {
    const flica = entry()
    expect(formatEntryAirportCode(flica, 'RIC')).toBe('KRIC')
    expect(formatEntryAirportCode(flica, 'LGA')).toBe('KLGA')
  })

  it('leaves manual IATA codes unchanged', () => {
    expect(formatEntryAirportCode(entry({ importSource: undefined, isImported: false }), 'LGA')).toBe(
      'LGA'
    )
  })
})

describe('getEntryFieldDisplay fromTo', () => {
  it('shows catalog ICAO for FLICA entries stored as IATA', () => {
    const display = getEntryFieldDisplay(entry(), 'fromTo')
    expect(display.text).toBe('KRIC → KLGA')
  })
})
