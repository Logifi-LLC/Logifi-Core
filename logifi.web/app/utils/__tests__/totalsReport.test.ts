import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'
import {
  addCalendarDays,
  addCalendarMonths,
  buildTotalsReportCsv,
  calculateTotalsReport,
  entryInCalendarWindow,
  filterEntriesForTotalsReport,
  formatTotalsHours,
  simTotalHours,
  windowStartYmd,
  type AirplaneTotals,
} from '../totalsReport'

/**
 * Fictional hand-worked logbook. asOf = 2026-11-13.
 *
 * Included airplane rows (void/superseded already stripped):
 *
 *  A  2026-11-10  ASEL  C172    total 1.0  pic 1.0  xc 1.0  dayLdg 2  appr 1
 *  B  2026-10-20  AMEL  E175    total 2.5  sic 2.5  night 1.0  actual 0.5
 *                               dayLdg 1  nightLdg 2  appr 2
 *  C  2026-08-01  ASEL  C172    total 1.5  dual 1.5  simInst 0.4  dayLdg 1
 *  D  2025-12-01  AMEL  E175    total 3.0  pic 3.0  xc 3.0  night 0.5  actual 0.3
 *  E  2025-10-01  ASEL  PA-28   total 2.0  pic 2.0  dualGiven 2.0  xc 2.0
 *  F  2024-06-15  AMEL  E175    total 4.0  pic 4.0
 *  I  2025-01-01  ASEL  C172    amendment of orig-amend; total 1.2 pic 1.2
 *  J  2026-09-15  AMEL  E175    total 3.0  pic 3.0  ftd 1.0
 *                               airplane total = 3.0 − 1.0 = 2.0
 *                               airplane pic  = 3.0 × (2.0/3.0) = 2.0
 *  K  2026-11-12  HELI  R22     total 0.8  pic 0.8
 *
 * Excluded:
 *  H-orig  2026-11-05  ASEL  9.0 PIC — superseded by void amendment
 *  H-void  2026-11-05  isVoid empty
 *  I-orig  2025-01-01  ASEL  1.0 — superseded by I
 *
 * Simulator (never added to airplane Total):
 *  G  2026-11-01  FFS  ffs 2.0  total 2.0  logbookType simulator
 *
 * All-time airplane (sum A+B+C+D+E+F+I+J-airplane+K):
 *  Total  = 1.0+2.5+1.5+3.0+2.0+4.0+1.2+2.0+0.8 = 18.0
 *  PIC    = 1.0 + 3.0 + 2.0 + 4.0 + 1.2 + 2.0 + 0.8 = 14.0
 *  SIC    = 2.5
 *  XC     = 1.0 + 3.0 + 2.0 = 6.0
 *  Night  = 1.0 + 0.5 = 1.5
 *  Actual = 0.5 + 0.3 = 0.8
 *  SimInst= 0.4
 *  DualR  = 1.5
 *  DualG  = 2.0
 *  Multi  = AMEL airplane totals B+D+F+J = 2.5+3.0+4.0+2.0 = 11.5
 *  Appr   = 1+2 = 3
 *  DayLdg = 2+1+1 = 4
 *  NightL = 2
 *
 * Category/Class:
 *  ASEL = A+C+E+I = 1.0+1.5+2.0+1.2 = 5.7
 *  AMEL = B+D+F+J = 2.5+3.0+4.0+2.0 = 11.5
 *  HELI = K = 0.8
 *  5.7+11.5+0.8 = 18.0
 *
 * Aircraft type:
 *  C172  = A+C+I = 1.0+1.5+1.2 = 3.7
 *  E175  = B+D+F+J = 11.5
 *  PA-28 = E = 2.0
 *  R22   = K = 0.8
 *  3.7+11.5+2.0+0.8 = 18.0
 *
 * Windows as of 2026-11-13 (inclusive YYYY-MM-DD, no Date TZ parsing):
 *  last 30  start 2026-10-14 → A,B,G,K airplane 1.0+2.5+0.8 = 4.3 (multi 2.5 from B)
 *  last 90  start 2026-08-15 → A,B,G,J,K airplane 1.0+2.5+2.0+0.8 = 6.3
 *  last 365 start 2025-11-13 → A,B,C,D,G,J,K airplane 1.0+2.5+1.5+3.0+2.0+0.8 = 10.8
 *  12 mo    start 2025-11-13 → same 10.8 as 365 on this asOf
 */

const AS_OF = '2026-11-13'

function entry(overrides: Partial<LogEntry> & { id: string; date: string }): LogEntry {
  return {
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N100AA',
    flightNumber: null,
    departure: 'KPAO',
    destination: 'KSFO',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    ...overrides,
  }
}

function times(partial: Partial<LogEntry['flightTime']>): LogEntry['flightTime'] {
  return { ...createEmptyFlightTime(), ...partial }
}

function perf(partial: Partial<LogEntry['performance']>): LogEntry['performance'] {
  return { ...createEmptyPerformance(), ...partial }
}

function fictionalLogbook(): LogEntry[] {
  return [
    entry({
      id: 'A',
      date: '2026-11-10',
      aircraftCategoryClass: 'ASEL',
      aircraftMakeModel: 'C172',
      registration: 'N100AA',
      flightTime: times({ total: 1.0, pic: 1.0, crossCountry: 1.0 }),
      performance: perf({ dayLandings: 2, approaches: [{ type: 'ILS', count: 1 }] }),
    }),
    entry({
      id: 'B',
      date: '2026-10-20',
      role: 'SIC',
      aircraftCategoryClass: 'AMEL',
      aircraftMakeModel: 'E175',
      registration: 'N200BB',
      flightTime: times({ total: 2.5, sic: 2.5, night: 1.0, actualInstrument: 0.5 }),
      performance: perf({ dayLandings: 1, nightLandings: 2, approachCount: 2, approachType: 'ILS' }),
    }),
    entry({
      id: 'C',
      date: '2026-08-01',
      role: 'Dual Received',
      aircraftCategoryClass: 'ASEL',
      aircraftMakeModel: 'C172',
      registration: 'N100AA',
      flightTime: times({ total: 1.5, dual: 1.5, simulatedInstrument: 0.4 }),
      performance: perf({ dayLandings: 1 }),
    }),
    entry({
      id: 'D',
      date: '2025-12-01',
      aircraftCategoryClass: 'AMEL',
      aircraftMakeModel: 'E175',
      registration: 'N200BB',
      flightTime: times({
        total: 3.0,
        pic: 3.0,
        crossCountry: 3.0,
        night: 0.5,
        actualInstrument: 0.3,
      }),
    }),
    entry({
      id: 'E',
      date: '2025-10-01',
      aircraftCategoryClass: 'ASEL',
      aircraftMakeModel: 'PA-28',
      registration: 'N300CC',
      flightTime: times({ total: 2.0, pic: 2.0, dualGiven: 2.0, crossCountry: 2.0 }),
    }),
    entry({
      id: 'F',
      date: '2024-06-15',
      aircraftCategoryClass: 'AMEL',
      aircraftMakeModel: 'E175',
      registration: 'N200BB',
      flightTime: times({ total: 4.0, pic: 4.0 }),
    }),
    entry({
      id: 'G',
      date: '2026-11-01',
      role: 'Dual Received',
      aircraftCategoryClass: 'FFS',
      aircraftMakeModel: 'B737 FFS',
      registration: 'SIM-1',
      logbookType: 'simulator',
      flightTime: times({ total: 2.0, ffs: 2.0, simulatedInstrument: 2.0 }),
    }),
    entry({
      id: 'H-orig',
      date: '2026-11-05',
      aircraftCategoryClass: 'ASEL',
      aircraftMakeModel: 'C172',
      flightTime: times({ total: 9.0, pic: 9.0 }),
    }),
    entry({
      id: 'H-void',
      date: '2026-11-05',
      aircraftCategoryClass: 'ASEL',
      aircraftMakeModel: 'C172',
      amendsEntryId: 'H-orig',
      isVoid: true,
      flightTime: createEmptyFlightTime(),
    }),
    entry({
      id: 'I-orig',
      date: '2025-01-01',
      aircraftCategoryClass: 'ASEL',
      aircraftMakeModel: 'C172',
      flightTime: times({ total: 1.0, pic: 1.0 }),
    }),
    entry({
      id: 'I',
      date: '2025-01-01',
      aircraftCategoryClass: 'ASEL',
      aircraftMakeModel: 'C172',
      amendsEntryId: 'I-orig',
      flightTime: times({ total: 1.2, pic: 1.2 }),
    }),
    entry({
      id: 'J',
      date: '2026-09-15',
      aircraftCategoryClass: 'AMEL',
      aircraftMakeModel: 'E175',
      registration: 'N200BB',
      flightTime: times({ total: 3.0, pic: 3.0, ftd: 1.0 }),
    }),
    entry({
      id: 'K',
      date: '2026-11-12',
      aircraftCategoryClass: 'HELI',
      aircraftMakeModel: 'R22',
      registration: 'N400DD',
      flightTime: times({ total: 0.8, pic: 0.8 }),
    }),
  ]
}

function expectAirplane(actual: AirplaneTotals, expected: Partial<AirplaneTotals>) {
  const full: AirplaneTotals = {
    total: 0,
    pic: 0,
    sic: 0,
    crossCountry: 0,
    night: 0,
    actualInstrument: 0,
    simulatedInstrument: 0,
    dualReceived: 0,
    dualGiven: 0,
    multiEngine: 0,
    approaches: 0,
    dayLandings: 0,
    nightLandings: 0,
    ...expected,
  }
  expect(actual).toEqual(full)
}

function category(report: ReturnType<typeof calculateTotalsReport>, label: string) {
  const row = report.byCategoryClass.find((item) => item.label === label)
  expect(row, `missing category ${label}`).toBeTruthy()
  return row!
}

function typeRow(report: ReturnType<typeof calculateTotalsReport>, label: string) {
  const row = report.byAircraftType.find((item) => item.label === label)
  expect(row, `missing type ${label}`).toBeTruthy()
  return row!
}

describe('totalsReport calendar windows', () => {
  it('adds calendar days on UTC Y-M-D components (no local Date parse)', () => {
    expect(addCalendarDays('2026-11-13', -30)).toBe('2026-10-14')
    expect(addCalendarDays('2026-11-13', -90)).toBe('2026-08-15')
    expect(addCalendarDays('2026-11-13', -365)).toBe('2025-11-13')
  })

  it('clamps 12-calendar-month subtraction on month ends', () => {
    expect(addCalendarMonths('2026-03-31', -12)).toBe('2025-03-31')
    expect(addCalendarMonths('2024-03-31', -1)).toBe('2024-02-29')
    expect(addCalendarMonths('2025-03-31', -1)).toBe('2025-02-28')
  })

  it('treats last 12 calendar months as month arithmetic, not 365 days', () => {
    // 2025 is not leap; 365 days before 2025-01-01 is 2024-01-02.
    expect(windowStartYmd('last365', '2025-01-01')).toBe('2024-01-02')
    expect(windowStartYmd('last12CalendarMonths', '2025-01-01')).toBe('2024-01-01')
  })

  it('uses logbook calendar digits, not timezone-shifted Date parsing', () => {
    expect(entryInCalendarWindow('2026-10-14T00:00:00.000Z', '2026-10-14', '2026-11-13')).toBe(true)
    expect(entryInCalendarWindow('2026-10-13T23:00:00.000Z', '2026-10-14', '2026-11-13')).toBe(false)
  })
})

describe('filterEntriesForTotalsReport', () => {
  it('drops voided amendments and superseded originals', () => {
    const ids = filterEntriesForTotalsReport(fictionalLogbook()).map((row) => row.id)
    expect(ids).not.toContain('H-orig')
    expect(ids).not.toContain('H-void')
    expect(ids).not.toContain('I-orig')
    expect(ids).toContain('I')
    expect(ids).toContain('A')
  })
})

describe('calculateTotalsReport — fictional logbook (hand-worked)', () => {
  const logbook = fictionalLogbook()

  it('all-time airplane grand total matches the hand sum of 18.0', () => {
    const report = calculateTotalsReport(logbook, 'all', AS_OF)
    expectAirplane(report.grandTotal.airplane, {
      total: 18.0,
      pic: 14.0,
      sic: 2.5,
      crossCountry: 6.0,
      night: 1.5,
      actualInstrument: 0.8,
      simulatedInstrument: 0.4,
      dualReceived: 1.5,
      dualGiven: 2.0,
      multiEngine: 11.5,
      approaches: 3,
      dayLandings: 4,
      nightLandings: 2,
    })
    expect(report.grandTotal.sim).toEqual({ ffs: 2.0, ftd: 1.0, atd: 0, unspecified: 0 })
    expect(simTotalHours(report.grandTotal.sim)).toBe(3.0)
    expect(report.grandTotal.airplane.total).not.toBe(20.0)
    expect(report.excludedVoidOrSuperseded).toBe(3)
  })

  it('category/class rows sum to the airplane grand total', () => {
    const report = calculateTotalsReport(logbook, 'all', AS_OF)
    expect(category(report, 'Airplane SEL').airplane.total).toBe(5.7)
    expect(category(report, 'Airplane MEL').airplane.total).toBe(11.5)
    expect(category(report, 'Rotorcraft Helicopter').airplane.total).toBe(0.8)
    const sum = report.byCategoryClass.reduce((acc, row) => acc + row.airplane.total, 0)
    expect(sum).toBe(18.0)
    expect(category(report, 'Airplane MEL').airplane.multiEngine).toBe(11.5)
    expect(category(report, 'Airplane SEL').airplane.multiEngine).toBe(0)
  })

  it('aircraft type rows sum to the airplane grand total', () => {
    const report = calculateTotalsReport(logbook, 'all', AS_OF)
    expect(typeRow(report, 'C172').airplane.total).toBe(3.7)
    expect(typeRow(report, 'E175').airplane.total).toBe(11.5)
    expect(typeRow(report, 'PA-28').airplane.total).toBe(2.0)
    expect(typeRow(report, 'R22').airplane.total).toBe(0.8)
    const sum = report.byAircraftType.reduce((acc, row) => acc + row.airplane.total, 0)
    expect(sum).toBe(18.0)
  })

  it('keeps FFS/FTD out of airplane totals and lists them in the sim section', () => {
    const report = calculateTotalsReport(logbook, 'all', AS_OF)
    expect(report.bySimulator.map((row) => row.key)).toEqual(['ffs', 'ftd'])
    expect(report.bySimulator.find((row) => row.key === 'ffs')?.sim.ffs).toBe(2.0)
    expect(report.bySimulator.find((row) => row.key === 'ftd')?.sim.ftd).toBe(1.0)
    expect(report.byCategoryClass.some((row) => row.key === 'ffs')).toBe(false)
    expect(report.byAircraftType.some((row) => /FFS/i.test(row.label))).toBe(false)
  })

  it('last 30/90/365 day windows match the hand-worked subsets', () => {
    const last30 = calculateTotalsReport(logbook, 'last30', AS_OF)
    expect(last30.windowStart).toBe('2026-10-14')
    expectAirplane(last30.grandTotal.airplane, {
      total: 4.3,
      pic: 1.8,
      sic: 2.5,
      crossCountry: 1.0,
      night: 1.0,
      actualInstrument: 0.5,
      multiEngine: 2.5,
      approaches: 3,
      dayLandings: 3,
      nightLandings: 2,
    })
    expect(last30.grandTotal.sim.ffs).toBe(2.0)
    expect(last30.grandTotal.sim.ftd).toBe(0)

    const last90 = calculateTotalsReport(logbook, 'last90', AS_OF)
    expect(last90.windowStart).toBe('2026-08-15')
    expect(last90.grandTotal.airplane.total).toBe(6.3)
    expect(last90.grandTotal.sim.ftd).toBe(1.0)

    const last365 = calculateTotalsReport(logbook, 'last365', AS_OF)
    expect(last365.windowStart).toBe('2025-11-13')
    expect(last365.grandTotal.airplane.total).toBe(10.8)
    expect(last365.grandTotal.airplane.pic).toBe(6.8)

    const last12 = calculateTotalsReport(logbook, 'last12CalendarMonths', AS_OF)
    expect(last12.windowStart).toBe('2025-11-13')
    expect(last12.grandTotal.airplane.total).toBe(10.8)
  })

  it('does not treat "turbine" in make/model as an engine-type column', () => {
    const csv = buildTotalsReportCsv(calculateTotalsReport(logbook, 'all', AS_OF))
    expect(csv.toLowerCase()).not.toContain('turbine')
  })

  it('formats tenths with the shared decimal-hours helper', () => {
    expect(formatTotalsHours(1.25)).toBe('1.3')
    expect(formatTotalsHours(0)).toBe('0.0')
  })

  it('exports CSV with category, type, and sim groups', () => {
    const csv = buildTotalsReportCsv(calculateTotalsReport(logbook, 'all', AS_OF))
    expect(csv).toContain('Grand total')
    expect(csv).toContain('Category/Class')
    expect(csv).toContain('Aircraft type')
    expect(csv).toContain('Simulator')
    expect(csv).toContain('Airplane SEL')
    expect(csv).toContain('18.0')
  })

  it('does not guess multi-engine from free-text make/model', () => {
    const twinName = [
      entry({
        id: 'twin-asel',
        date: '2026-11-01',
        aircraftCategoryClass: 'ASEL',
        aircraftMakeModel: 'Twin something',
        flightTime: times({ total: 1.0, pic: 1.0 }),
      }),
    ]
    const report = calculateTotalsReport(twinName, 'all', AS_OF)
    expect(report.grandTotal.airplane.multiEngine).toBe(0)
  })
})
