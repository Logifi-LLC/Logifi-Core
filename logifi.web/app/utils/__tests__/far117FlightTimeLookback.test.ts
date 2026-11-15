import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import {
  calculateFar117FlightTimeLookbacks,
  FAR117_LIMIT_672_HOURS,
  FAR117_LIMIT_365_DAYS,
  filterEntriesForFar117,
} from '../far117FlightTimeLookback'

function fictionalEntry(overrides: Partial<LogEntry> & Pick<LogEntry, 'id' | 'date'>): LogEntry {
  return {
    id: overrides.id,
    date: overrides.date,
    role: 'PIC',
    aircraftCategoryClass: 'Airplane Multi-Engine Land',
    categoryClassTime: null,
    aircraftMakeModel: 'B737',
    registration: 'N117FT',
    flightNumber: null,
    departure: 'KDFW',
    destination: 'KDEN',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: { total: 2.5, pic: 2.5, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 },
    performance: {
      dayTakeoffs: 1,
      nightTakeoffs: 0,
      dayLandings: 1,
      nightLandings: 0,
      approachCount: null,
      approachType: null,
      holdingProcedures: null,
    },
    ...overrides,
  }
}

const ref = new Date('2026-06-15T18:00:00.000Z')

describe('filterEntriesForFar117', () => {
  it('drops void, superseded, and simulator entries', () => {
    const entries: LogEntry[] = [
      fictionalEntry({ id: 'flight', date: '2026-06-10' }),
      fictionalEntry({ id: 'void', date: '2026-06-10', isVoid: true }),
      fictionalEntry({ id: 'sim', date: '2026-06-10', logbookType: 'simulator', flightTime: { total: 2, pic: 0, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 2, ftd: 0, atd: 0 } }),
      fictionalEntry({ id: 'amend', date: '2026-06-11', amendsEntryId: 'signed-old' }),
      fictionalEntry({ id: 'signed-old', date: '2026-06-01' }),
    ]
    expect(filterEntriesForFar117(entries).map((e) => e.id).sort()).toEqual(['amend', 'flight'])
  })
})

describe('calculateFar117FlightTimeLookbacks', () => {
  it('sums block time inside 365 consecutive calendar days', () => {
    const entries = [
      fictionalEntry({ id: 'in', date: '2026-06-15', flightTime: { total: 5, pic: 5, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 } }),
      fictionalEntry({ id: 'edge', date: '2025-06-16', flightTime: { total: 3, pic: 3, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 } }),
      fictionalEntry({ id: 'out', date: '2025-06-15', flightTime: { total: 99, pic: 99, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 } }),
    ]
    const result = calculateFar117FlightTimeLookbacks(entries, ref)
    expect(result.consecutive365CalendarDays.usedHours).toBe(8)
    expect(result.consecutive365CalendarDays.remainingHours).toBe(FAR117_LIMIT_365_DAYS - 8)
  })

  it('uses OOOI out for the 672-hour window', () => {
    const justInside = fictionalEntry({
      id: 'inside',
      date: '2026-06-12',
      flightTime: { total: 4, pic: 4, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 },
      oooi: { out: '1800', off: '1830', on: '2030', in: '2045', isZulu: true },
    })
    const justOutside = fictionalEntry({
      id: 'outside',
      date: '2026-05-01',
      flightTime: { total: 50, pic: 50, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 },
      oooi: { out: '1200', off: null, on: null, in: null, isZulu: true },
    })
    const result = calculateFar117FlightTimeLookbacks([justInside, justOutside], ref)
    expect(result.consecutive672Hours.usedHours).toBe(4)
    expect(result.consecutive672Hours.usedWholeDayApproximation).toBe(false)
    expect(result.consecutive672Hours.remainingHours).toBe(FAR117_LIMIT_672_HOURS - 4)
  })

  it('flags whole-day approximation when OOOI out is missing', () => {
    const entries = [
      fictionalEntry({
        id: 'day-only',
        date: '2026-06-14',
        flightTime: { total: 6.2, pic: 6.2, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 },
      }),
    ]
    const result = calculateFar117FlightTimeLookbacks(entries, ref)
    expect(result.consecutive672Hours.usedHours).toBe(6.2)
    expect(result.consecutive672Hours.usedWholeDayApproximation).toBe(true)
  })

  it('places a midnight-crossing leg by Zulu out time on the entry date', () => {
    const crossing = fictionalEntry({
      id: 'red-eye',
      date: '2026-06-14',
      flightTime: { total: 3.1, pic: 3.1, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 },
      oooi: { out: '2330', off: '2345', on: '0200', in: '0215', isZulu: true },
    })
    const beforeWindow = fictionalEntry({
      id: 'too-old',
      date: '2026-05-01',
      flightTime: { total: 10, pic: 10, sic: 0, dual: 0, dualGiven: 0, solo: 0, crossCountry: 0, night: 0, actualInstrument: 0, simulatedInstrument: 0, ffs: 0, ftd: 0, atd: 0 },
      oooi: { out: '1000', off: null, on: null, in: null, isZulu: true },
    })
    const result = calculateFar117FlightTimeLookbacks([crossing, beforeWindow], ref)
    expect(result.consecutive672Hours.usedHours).toBe(3.1)
    expect(result.consecutive672Hours.usedWholeDayApproximation).toBe(false)
  })
})