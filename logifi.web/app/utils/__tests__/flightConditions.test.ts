import { describe, expect, it } from 'vitest'
import { getDisplayConditions, sanitizeFlightConditions } from '../flightConditions'
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

describe('sanitizeFlightConditions', () => {
  it('maps display labels onto canonical values and drops duplicates', () => {
    expect(sanitizeFlightConditions(['IFR', 'ifr', 'Night', 'nightVfr', 'Cross-Country'])).toEqual([
      'ifr',
      'nightVfr',
      'crossCountry',
    ])
  })
})

describe('getDisplayConditions', () => {
  it('shows IFR only once when stored as IFR with actual instrument time', () => {
    const display = getDisplayConditions(
      entry({
        flightConditions: ['IFR', 'crossCountry'],
        flightTime: {
          ...createEmptyFlightTime(),
          total: 1.3,
          actualInstrument: 1.3,
          crossCountry: 1.3,
        },
      })
    )
    expect(display.filter((label) => label === 'IFR')).toHaveLength(1)
    expect(display).toEqual(['IFR', 'Actual Instrument', 'Cross-Country'])
  })

  it('shows Night only once when stored as Night and night time is logged', () => {
    const display = getDisplayConditions(
      entry({
        flightConditions: ['Night'],
        flightTime: { ...createEmptyFlightTime(), total: 1.3, night: 0.4 },
      })
    )
    expect(display.filter((label) => label === 'Night')).toHaveLength(1)
    expect(display).toEqual(['Night'])
  })
})
