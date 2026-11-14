import { describe, expect, it } from 'vitest'
import {
  auditLogbook,
  checkCrossCountrySameAirport,
  checkDuplicateLegs,
  entriesAreDuplicateLegs,
  checkFutureDate,
  checkNightLandingsWithoutNight,
  checkOooiOrder,
  checkPicSic,
  checkSimAirplaneMix,
  checkSubTimeExceedsTotal,
  checkZeroTotalNonSim,
  duplicateLegKeys,
} from '../logbookAudit'
import {
  createEmptyFlightTime,
  createEmptyOOOI,
  createEmptyPerformance,
  type LogEntry,
} from '../logbookTypes'

function fixtureEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'entry-1',
    date: '2024-03-15',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N123AB',
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KBOS',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    logbookType: 'flight',
    flightTime: { ...createEmptyFlightTime(), total: 2.0, pic: 2.0 },
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    ...overrides,
  }
}

describe('logbookAudit', () => {
  it('does not flag sub-time vs total when both round to the same tenth', () => {
    const rounded = checkSubTimeExceedsTotal(
      fixtureEntry({
        categoryClassTime: 1.43,
        flightTime: { ...createEmptyFlightTime(), total: 1.4333, pic: 1.4 },
      })
    )
    expect(rounded).toHaveLength(0)

    const stillBad = checkSubTimeExceedsTotal(
      fixtureEntry({
        categoryClassTime: 3.2,
        flightTime: { ...createEmptyFlightTime(), total: 2.2, pic: 2.2 },
      })
    )
    expect(stillBad.some((item) => item.field === 'categoryClassTime')).toBe(true)
  })

  it('flags sub-time greater than total including cat/class', () => {
    const entry = fixtureEntry({
      categoryClassTime: 3.2,
      flightTime: {
        ...createEmptyFlightTime(),
        total: 1.5,
        pic: 1.5,
        night: 2.0,
        crossCountry: 1.5,
      },
    })

    const findings = checkSubTimeExceedsTotal(entry)
    expect(findings.some((item) => item.field === 'night' && item.severity === 'error')).toBe(true)
    expect(findings.some((item) => item.field === 'categoryClassTime')).toBe(true)
    expect(findings.some((item) => item.field === 'pic')).toBe(false)
  })

  it('flags PIC + SIC > total as error, and both-equal-total on a PIC role as check', () => {
    const excess = checkPicSic(
      fixtureEntry({
        role: 'PIC',
        flightTime: { ...createEmptyFlightTime(), total: 2.0, pic: 2.0, sic: 1.0 },
      })
    )
    expect(excess).toHaveLength(1)
    expect(excess[0].ruleId).toBe('pic_sic_exceeds_total')
    expect(excess[0].severity).toBe('error')

    const bothRoles = checkPicSic(
      fixtureEntry({
        role: 'SIC',
        flightTime: { ...createEmptyFlightTime(), total: 1.8, pic: 1.8, sic: 1.8 },
      })
    )
    expect(bothRoles).toHaveLength(1)
    expect(bothRoles[0].ruleId).toBe('pic_sic_both_total')
    expect(bothRoles[0].severity).toBe('check')

    const noRole = checkPicSic(
      fixtureEntry({
        role: '',
        flightTime: { ...createEmptyFlightTime(), total: 1.8, pic: 1.8, sic: 1.8 },
      })
    )
    expect(noRole[0]?.ruleId).toBe('pic_sic_exceeds_total')
  })

  it('flags night landings without night time, and does not flag night time without landings', () => {
    const landingsOnly = checkNightLandingsWithoutNight(
      fixtureEntry({
        flightTime: { ...createEmptyFlightTime(), total: 1.2, pic: 1.2, night: 0 },
        performance: { ...createEmptyPerformance(), nightLandings: 2 },
      })
    )
    expect(landingsOnly).toHaveLength(1)
    expect(landingsOnly[0].severity).toBe('check')

    const nightOnly = checkNightLandingsWithoutNight(
      fixtureEntry({
        flightTime: { ...createEmptyFlightTime(), total: 1.2, pic: 1.2, night: 0.4 },
        performance: { ...createEmptyPerformance(), nightLandings: 0 },
      })
    )
    expect(nightOnly).toHaveLength(0)
  })

  it('flags total = 0 on a non-sim entry with airports or OOOI', () => {
    const withAirports = checkZeroTotalNonSim(
      fixtureEntry({
        flightTime: { ...createEmptyFlightTime(), total: 0, pic: 0 },
      })
    )
    expect(withAirports).toHaveLength(1)
    expect(withAirports[0].severity).toBe('error')

    const sim = checkZeroTotalNonSim(
      fixtureEntry({
        logbookType: 'simulator',
        departure: '—',
        destination: '—',
        flightTime: { ...createEmptyFlightTime(), total: 0, atd: 1.2 },
      })
    )
    expect(sim).toHaveLength(0)
  })

  it('flags duplicate legs by date + from/to + flight number, excluding voided', () => {
    const a = fixtureEntry({ id: 'a', flightNumber: '4401' })
    const b = fixtureEntry({ id: 'b', flightNumber: '4401' })
    const otherTail = fixtureEntry({
      id: 'c',
      registration: 'N999ZZ',
      flightNumber: null,
    })
    const voided = fixtureEntry({ id: 'd', flightNumber: '4401', isVoid: true })

    const findings = checkDuplicateLegs([a, b, otherTail, voided])
    const ids = findings.map((item) => item.entryId).sort()
    expect(ids).toEqual(['a', 'b'])
    expect(findings.every((item) => item.severity === 'check')).toBe(true)
    expect(duplicateLegKeys(a).some((key) => key.includes('f:4401'))).toBe(true)
  })

  it('does not flag airline same city pair with different flight numbers', () => {
    const legA = fixtureEntry({
      id: 'leg-a',
      flightNumber: 'DAL100',
      flightTime: { ...createEmptyFlightTime(), total: 2.1, pic: 2.1 },
    })
    const legB = fixtureEntry({
      id: 'leg-b',
      flightNumber: 'DAL212',
      flightTime: { ...createEmptyFlightTime(), total: 2.3, pic: 2.3 },
    })
    expect(entriesAreDuplicateLegs(legA, legB)).toBe(false)
    expect(checkDuplicateLegs([legA, legB])).toHaveLength(0)
  })

  it('does not flag CFI lessons same tail without flight numbers when totals differ', () => {
    const lessonA = fixtureEntry({
      id: 'lesson-a',
      flightNumber: null,
      registration: 'N172CF',
      flightTime: { ...createEmptyFlightTime(), total: 1.2, dualGiven: 1.2 },
    })
    const lessonB = fixtureEntry({
      id: 'lesson-b',
      flightNumber: null,
      registration: 'N172CF',
      flightTime: { ...createEmptyFlightTime(), total: 1.5, dualGiven: 1.5 },
    })
    expect(checkDuplicateLegs([lessonA, lessonB])).toHaveLength(0)
  })

  it('flags true tail-only duplicates when totals match', () => {
    const dupA = fixtureEntry({
      id: 'dup-a',
      flightNumber: null,
      registration: 'N555AA',
      flightTime: { ...createEmptyFlightTime(), total: 1.0, pic: 1.0 },
    })
    const dupB = fixtureEntry({
      id: 'dup-b',
      flightNumber: null,
      registration: 'N555AA',
      flightTime: { ...createEmptyFlightTime(), total: 1.0, pic: 1.0 },
    })
    const ids = checkDuplicateLegs([dupA, dupB]).map((item) => item.entryId).sort()
    expect(ids).toEqual(['dup-a', 'dup-b'])
  })

  it('flags sim time logged as airplane, and airplane time on a sim-logbook entry', () => {
    const simAsAirplane = checkSimAirplaneMix(
      fixtureEntry({
        logbookType: 'flight',
        aircraftCategoryClass: 'FTD',
        aircraftMakeModel: 'Redbird FTD',
        flightTime: { ...createEmptyFlightTime(), total: 1.5, pic: 1.5 },
      })
    )
    expect(simAsAirplane.some((item) => item.ruleId === 'sim_as_airplane')).toBe(true)

    const mixedValid = checkSimAirplaneMix(
      fixtureEntry({
        logbookType: 'flight',
        aircraftCategoryClass: 'ASEL',
        flightTime: { ...createEmptyFlightTime(), total: 0.8, pic: 0.8, ftd: 1.3 },
      })
    )
    expect(mixedValid).toHaveLength(0)

    const airplaneOnSim = checkSimAirplaneMix(
      fixtureEntry({
        logbookType: 'simulator',
        aircraftCategoryClass: 'ATD',
        departure: '—',
        destination: '—',
        flightTime: { ...createEmptyFlightTime(), total: 1.2, pic: 1.2, atd: 1.2 },
      })
    )
    expect(airplaneOnSim.some((item) => item.ruleId === 'airplane_on_sim')).toBe(true)
  })

  it('flags future dates', () => {
    const findings = checkFutureDate(
      fixtureEntry({ date: '2099-01-01' }),
      new Date('2024-06-01T12:00:00Z')
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].ruleId).toBe('future_date')
    expect(findings[0].severity).toBe('error')
  })

  it('flags OOOI out of order and allows midnight wrap', () => {
    const reversed = checkOooiOrder(
      fixtureEntry({
        oooi: { out: '1200', off: '1100', on: '1300', in: '1320', isZulu: true },
      })
    )
    expect(reversed).toHaveLength(1)
    expect(reversed[0].severity).toBe('error')

    const overnight = checkOooiOrder(
      fixtureEntry({
        oooi: { out: '2350', off: '0010', on: '0100', in: '0115', isZulu: true },
      })
    )
    expect(overnight).toHaveLength(0)
  })

  it('flags cross-country with the same from/to and no route', () => {
    const findings = checkCrossCountrySameAirport(
      fixtureEntry({
        departure: 'KORD',
        destination: 'KORD',
        route: '',
        flightTime: { ...createEmptyFlightTime(), total: 2.4, pic: 2.4, crossCountry: 2.4 },
      })
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].ruleId).toBe('xc_same_airport')
    expect(findings[0].severity).toBe('check')

    const withRoute = checkCrossCountrySameAirport(
      fixtureEntry({
        departure: 'KORD',
        destination: 'KORD',
        route: 'KMDW',
        flightTime: { ...createEmptyFlightTime(), total: 2.4, pic: 2.4, crossCountry: 2.4 },
      })
    )
    expect(withRoute).toHaveLength(0)
  })

  it('auditLogbook groups findings and stays linear on 5000 entries', () => {
    const entries: LogEntry[] = []
    for (let i = 0; i < 5000; i += 1) {
      entries.push(
        fixtureEntry({
          id: `leg-${i}`,
          date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
          departure: i % 2 === 0 ? 'KJFK' : 'KBOS',
          destination: i % 2 === 0 ? 'KBOS' : 'KJFK',
          registration: `N${String(i).padStart(5, '0')}`,
          flightNumber: String(1000 + i),
        })
      )
    }
    entries[10] = fixtureEntry({
      id: 'dup-a',
      date: '2024-08-02',
      departure: 'KLAX',
      destination: 'KSFO',
      registration: 'N555AA',
      flightNumber: '88',
    })
    entries[11] = fixtureEntry({
      id: 'dup-b',
      date: '2024-08-02',
      departure: 'KLAX',
      destination: 'KSFO',
      registration: 'N555AA',
      flightNumber: '88',
    })
    entries[12] = fixtureEntry({
      id: 'night-bad',
      date: '2024-08-03',
      flightTime: { ...createEmptyFlightTime(), total: 1.0, pic: 1.0 },
      performance: { ...createEmptyPerformance(), nightLandings: 1 },
    })

    const started = Date.now()
    const report = auditLogbook(entries, { now: new Date('2024-09-01T00:00:00Z') })
    expect(Date.now() - started).toBeLessThan(1500)
    expect(report.groups.some((group) => group.ruleId === 'duplicate_legs' && group.count === 2)).toBe(true)
    expect(report.groups.some((group) => group.ruleId === 'night_landings_without_night')).toBe(true)
    expect(report.findings.every((item) => item.severity === 'error' || item.severity === 'check')).toBe(true)
  })
})
