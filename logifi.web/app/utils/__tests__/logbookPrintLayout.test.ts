import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'
import {
  clampRowsPerPage,
  DEFAULT_ROWS_PER_PAGE,
  emptyPaperTotals,
  entryToPaperRow,
  filterEntriesForPaperLogbook,
  formatPaperHours,
  paginatePaperLogbook,
} from '../logbookPrintLayout'

/**
 * Fictional paper-logbook fixture (not a real logbook).
 *
 * Chronological after void/superseded filter, oldest first:
 *
 *  1  A  2024-03-01  C172   N100AA  KPAO→KSQL  ASEL
 *       PIC 1.0  XC 1.0  Total 1.0  App 1  DayLdg 2
 *  2  B  2024-03-02  C172   N100AA  KSQL→KPAO  ASEL
 *       PIC 0.8  Total 0.8  DayLdg 1
 *  3  C  2024-03-10  E175   N200BB  KSFO→KLAX  AMEL
 *       SIC 2.5  Night 1.0  Act 0.4  Total 2.5  App 2  NightLdg 2
 *  4  D  2024-03-11  E175   N200BB  KLAX→KSFO  AMEL
 *       SIC 2.2  Total 2.2  DayLdg 1
 *  5  E  2024-03-20  PA-28  N300CC  KPAO→KHWD  ASEL
 *       DualR 1.5  Sim 0.3  Total 1.5  DayLdg 3
 *
 * Excluded:
 *  VOID-ORIG  2024-03-05  9.0 PIC — superseded by void amendment
 *  VOID       2024-03-05  isVoid empty amendment
 *
 * Hand-worked page totals at 2 rows/page (full book, no date filter):
 *
 *  Page 1  forwarded all 0
 *          page: PIC 1.8  XC 1.0  Total 1.8  App 1  DayLdg 3
 *          to date = page
 *  Page 2  forwarded = page 1 to date
 *          page: SIC 4.7  Night 1.0  Act 0.4  Total 4.7  App 2  DayLdg 1  NightLdg 2
 *          to date: PIC 1.8  SIC 4.7  XC 1.0  Night 1.0  Act 0.4  Total 6.5
 *                   App 3  DayLdg 4  NightLdg 2
 *  Page 3  forwarded = page 2 to date
 *          page: DualR 1.5  Sim 0.3  Total 1.5  DayLdg 3
 *          to date: PIC 1.8  SIC 4.7  DualR 1.5  XC 1.0  Night 1.0  Act 0.4
 *                   Sim 0.3  Total 8.0  App 3  DayLdg 7  NightLdg 2
 *
 * Date range 2024-03-10 .. 2024-03-11:
 *  Prior (A+B) becomes amount forwarded on page 1: PIC 1.8 XC 1.0 Total 1.8 App 1 DayLdg 3
 *  In-range C+D fill one 2-row page; to date matches full-book page 2.
 */

function entry(overrides: Partial<LogEntry> & { id: string; date: string }): LogEntry {
  return {
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N100AA',
    flightNumber: null,
    departure: 'KPAO',
    destination: 'KSQL',
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
      id: 'C',
      date: '2024-03-10',
      role: 'SIC',
      aircraftCategoryClass: 'AMEL',
      aircraftMakeModel: 'E175',
      registration: 'N200BB',
      departure: 'KSFO',
      destination: 'KLAX',
      flightTime: times({ total: 2.5, sic: 2.5, night: 1.0, actualInstrument: 0.4 }),
      performance: perf({ nightLandings: 2, approaches: [{ type: 'ILS', count: 2 }] }),
    }),
    entry({
      id: 'VOID-ORIG',
      date: '2024-03-05',
      flightTime: times({ total: 9.0, pic: 9.0 }),
    }),
    entry({
      id: 'VOID',
      date: '2024-03-05',
      amendsEntryId: 'VOID-ORIG',
      isVoid: true,
      flightTime: createEmptyFlightTime(),
    }),
    entry({
      id: 'A',
      date: '2024-03-01',
      route: 'V25',
      remarks: 'Dual review',
      flightTime: times({ total: 1.0, pic: 1.0, crossCountry: 1.0 }),
      performance: perf({ dayLandings: 2, approaches: [{ type: 'ILS', count: 1 }] }),
    }),
    entry({
      id: 'B',
      date: '2024-03-02',
      departure: 'KSQL',
      destination: 'KPAO',
      flightTime: times({ total: 0.8, pic: 0.8 }),
      performance: perf({ dayLandings: 1 }),
    }),
    entry({
      id: 'E',
      date: '2024-03-20',
      aircraftMakeModel: 'PA-28',
      registration: 'N300CC',
      destination: 'KHWD',
      role: 'Dual Received',
      flightTime: times({ total: 1.5, dual: 1.5, simulatedInstrument: 0.3 }),
      performance: perf({ dayLandings: 3 }),
    }),
    entry({
      id: 'D',
      date: '2024-03-11',
      role: 'SIC',
      aircraftCategoryClass: 'AMEL',
      aircraftMakeModel: 'E175',
      registration: 'N200BB',
      departure: 'KLAX',
      destination: 'KSFO',
      flightTime: times({ total: 2.2, sic: 2.2 }),
      performance: perf({ dayLandings: 1 }),
    }),
  ]
}

describe('clampRowsPerPage', () => {
  it('defaults, clamps, and rounds', () => {
    expect(clampRowsPerPage(undefined)).toBe(DEFAULT_ROWS_PER_PAGE)
    expect(clampRowsPerPage(13)).toBe(13)
    expect(clampRowsPerPage(2)).toBe(8)
    expect(clampRowsPerPage(40)).toBe(20)
    expect(clampRowsPerPage(10.4)).toBe(10)
  })
})

describe('filterEntriesForPaperLogbook', () => {
  it('drops void amendments and superseded originals', () => {
    const kept = filterEntriesForPaperLogbook(fictionalLogbook()).map((e) => e.id)
    expect(kept.sort()).toEqual(['A', 'B', 'C', 'D', 'E'])
  })
})

describe('entryToPaperRow', () => {
  it('maps flight-time fields, approaches, and route/remarks', () => {
    const row = entryToPaperRow(
      fictionalLogbook().find((e) => e.id === 'A')!
    )
    expect(row.date).toBe('03/01/2024')
    expect(row.aircraftType).toBe('C172')
    expect(row.ident).toBe('N100AA')
    expect(row.from).toBe('KPAO')
    expect(row.to).toBe('KSQL')
    expect(row.routeRemarks).toBe('V25 · Dual review')
    expect(row.categoryClass).toBe('ASEL')
    expect(row.approaches).toBe(1)
    expect(row.dayLandings).toBe(2)
    expect(row.pic).toBe(1)
    expect(row.crossCountry).toBe(1)
    expect(row.total).toBe(1)
  })
})

describe('formatPaperHours', () => {
  it('uses tenths and can blank zeros on flight rows', () => {
    expect(formatPaperHours(1)).toBe('1.0')
    expect(formatPaperHours(0)).toBe('0.0')
    expect(formatPaperHours(0, { emptyWhenZero: true })).toBe('')
  })
})

describe('paginatePaperLogbook', () => {
  it('builds hand-worked page totals and forwarded totals at 2 rows/page', () => {
    const doc = paginatePaperLogbook(fictionalLogbook(), {
      rowsPerPage: 2,
      pilotName: 'Test Pilot',
    })
    expect(doc.pages).toHaveLength(3)
    expect(doc.pages.map((p) => p.rows.map((r) => r.id))).toEqual([
      ['A', 'B'],
      ['C', 'D'],
      ['E'],
    ])

    const [page1, page2, page3] = doc.pages
    expect(page1!.amountForwarded).toEqual(emptyPaperTotals())
    expect(page1!.pageTotals).toEqual({
      ...emptyPaperTotals(),
      pic: 1.8,
      crossCountry: 1.0,
      total: 1.8,
      approaches: 1,
      dayLandings: 3,
    })
    expect(page1!.totalsToDate).toEqual(page1!.pageTotals)
    expect(page1!.slots).toHaveLength(2)

    expect(page2!.amountForwarded).toEqual(page1!.totalsToDate)
    expect(page2!.pageTotals).toEqual({
      ...emptyPaperTotals(),
      sic: 4.7,
      night: 1.0,
      actualInstrument: 0.4,
      total: 4.7,
      approaches: 2,
      dayLandings: 1,
      nightLandings: 2,
    })
    expect(page2!.totalsToDate.total).toBe(6.5)
    expect(page2!.totalsToDate.pic).toBe(1.8)
    expect(page2!.totalsToDate.sic).toBe(4.7)
    expect(page2!.totalsToDate.approaches).toBe(3)
    expect(page2!.totalsToDate.dayLandings).toBe(4)

    expect(page3!.amountForwarded).toEqual(page2!.totalsToDate)
    expect(page3!.pageTotals.dualReceived).toBe(1.5)
    expect(page3!.pageTotals.simulatedInstrument).toBe(0.3)
    expect(page3!.pageTotals.total).toBe(1.5)
    expect(page3!.pageTotals.dayLandings).toBe(3)
    expect(page3!.totalsToDate.total).toBe(8.0)
    expect(page3!.slots.filter((s) => s === null)).toHaveLength(1)
  })

  it('paginates at 8 rows/page with forwarded zeros then running totals to date', () => {
    const doc = paginatePaperLogbook(fictionalLogbook(), { rowsPerPage: 8 })
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0]!.amountForwarded).toEqual(emptyPaperTotals())
    expect(doc.pages[0]!.pageTotals.total).toBe(8.0)
    expect(doc.pages[0]!.totalsToDate.total).toBe(8.0)
    expect(doc.pages[0]!.slots).toHaveLength(8)
    expect(doc.pages[0]!.slots.filter((s) => s === null)).toHaveLength(3)
    expect(doc.excludedVoidOrSuperseded).toBe(2)
  })

  it('carries amount forwarded from entries before the date range', () => {
    const doc = paginatePaperLogbook(fictionalLogbook(), {
      rowsPerPage: 8,
      dateStart: '2024-03-10',
      dateEnd: '2024-03-11',
    })
    expect(doc.includedCount).toBe(2)
    expect(doc.forwardedFromPrior).toBe(2)
    expect(doc.pages).toHaveLength(1)
    expect(doc.pages[0]!.rows.map((r) => r.id)).toEqual(['C', 'D'])
    expect(doc.pages[0]!.amountForwarded).toEqual({
      ...emptyPaperTotals(),
      pic: 1.8,
      crossCountry: 1.0,
      total: 1.8,
      approaches: 1,
      dayLandings: 3,
    })
    expect(doc.pages[0]!.pageTotals.total).toBe(4.7)
    expect(doc.pages[0]!.totalsToDate.total).toBe(6.5)
    expect(doc.pages[0]!.totalsToDate.pic).toBe(1.8)
    expect(doc.pages[0]!.totalsToDate.sic).toBe(4.7)
  })

  it('returns no pages when the range has no entries', () => {
    const doc = paginatePaperLogbook(fictionalLogbook(), {
      dateStart: '2025-01-01',
      dateEnd: '2025-01-31',
    })
    expect(doc.pages).toEqual([])
    expect(doc.includedCount).toBe(0)
    expect(doc.forwardedFromPrior).toBe(5)
  })

  it('rounds tenths when summing 0.1 + 0.2', () => {
    const book: LogEntry[] = [
      entry({
        id: 't1',
        date: '2024-01-01',
        flightTime: times({ total: 0.1, pic: 0.1 }),
      }),
      entry({
        id: 't2',
        date: '2024-01-02',
        flightTime: times({ total: 0.2, pic: 0.2 }),
      }),
    ]
    const doc = paginatePaperLogbook(book, { rowsPerPage: 8 })
    expect(doc.pages[0]!.pageTotals.total).toBe(0.3)
    expect(doc.pages[0]!.pageTotals.pic).toBe(0.3)
  })
})
