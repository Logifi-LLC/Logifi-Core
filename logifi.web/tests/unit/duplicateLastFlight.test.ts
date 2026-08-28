import { describe, expect, it } from 'vitest'
import { buildSupersededIdSet } from '../../app/utils/logEntryAmendments'
import {
  buildDuplicatedDraft,
  findDuplicableLastEntry,
} from '../../app/utils/duplicateLastFlight'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
  type LogEntry,
} from '../../app/utils/logbookTypes'

function entry(overrides: Partial<LogEntry>): LogEntry {
  return {
    id: 'id',
    date: '2026-08-20',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: 1.2,
    aircraftMakeModel: 'C172',
    registration: 'N17XX',
    flightNumber: '123',
    departure: 'KATL',
    destination: 'KORD',
    route: 'V97',
    trainingElements: 'Jane Doe',
    trainingInstructor: 'CFI Smith',
    instructorCertificate: '1234567',
    picName: 'Pat PIC',
    sicName: 'Sam SIC',
    flightConditions: ['nightVfr'],
    remarks: 'keep out',
    tags: ['IPC'],
    logbookType: 'flight',
    flightTime: {
      ...createEmptyFlightTime(),
      total: 2.3,
      pic: 2.3,
      night: 0.4,
    },
    performance: {
      ...createEmptyPerformance(),
      dayLandings: 2,
    },
    oooi: { out: '1200', off: '1210', on: '1400', in: '1410', isZulu: true },
    flagged: true,
    ...overrides,
  }
}

describe('findDuplicableLastEntry', () => {
  it('returns the newest entry in the active logbook', () => {
    const entries = [
      entry({ id: 'older', date: '2026-08-01', registration: 'N1' }),
      entry({ id: 'newer', date: '2026-08-21', registration: 'N2' }),
    ]
    const last = findDuplicableLastEntry(entries, 'flight', new Set())
    expect(last?.id).toBe('newer')
  })

  it('skips void and superseded originals', () => {
    const original = entry({ id: 'orig', date: '2026-08-22' })
    const amendment = entry({
      id: 'amend',
      date: '2026-08-22',
      amendsEntryId: 'orig',
    })
    const voided = entry({ id: 'void', date: '2026-08-23', isVoid: true })
    const older = entry({ id: 'ok', date: '2026-08-10' })
    const superseded = buildSupersededIdSet([original, amendment, voided, older])
    const last = findDuplicableLastEntry(
      [original, amendment, voided, older],
      'flight',
      superseded
    )
    expect(last?.id).toBe('amend')
  })

  it('ignores the other logbook even if it is newer', () => {
    const sim = entry({
      id: 'sim',
      date: '2026-08-24',
      logbookType: 'simulator',
      flightTime: { ...createEmptyFlightTime(), atd: 1.5, total: 1.5 },
    })
    const flight = entry({ id: 'flight', date: '2026-08-01' })
    expect(findDuplicableLastEntry([sim, flight], 'flight', new Set())?.id).toBe(
      'flight'
    )
    expect(
      findDuplicableLastEntry([sim, flight], 'simulator', new Set())?.id
    ).toBe('sim')
  })

  it('returns null when nothing is duplicable', () => {
    expect(findDuplicableLastEntry([], 'flight', new Set())).toBeNull()
    expect(
      findDuplicableLastEntry(
        [entry({ id: 'v', isVoid: true })],
        'flight',
        new Set()
      )
    ).toBeNull()
  })
})

describe('buildDuplicatedDraft', () => {
  it('copies aircraft, route, crew, date, and logbook type with empty hours', () => {
    const source = entry({ id: 'src', amendsEntryId: 'someone' })
    const draft = buildDuplicatedDraft(source)

    expect(draft.date).toBe('2026-08-20')
    expect(draft.aircraftMakeModel).toBe('C172')
    expect(draft.registration).toBe('N17XX')
    expect(draft.aircraftCategoryClass).toBe('ASEL')
    expect(draft.departure).toBe('KATL')
    expect(draft.destination).toBe('KORD')
    expect(draft.route).toBe('V97')
    expect(draft.role).toBe('PIC')
    expect(draft.trainingElements).toBe('Jane Doe')
    expect(draft.trainingInstructor).toBe('CFI Smith')
    expect(draft.instructorCertificate).toBe('1234567')
    expect(draft.picName).toBe('Pat PIC')
    expect(draft.sicName).toBe('Sam SIC')
    expect(draft.logbookType).toBe('flight')
    expect(draft.flightTime).toEqual(createEmptyFlightTime())
    expect(draft.performance.dayLandings).toBeNull()
    expect(draft.oooi).toEqual({
      out: null,
      off: null,
      on: null,
      in: null,
      isZulu: true,
    })
    expect(draft.remarks).toBe('')
    expect(draft.tags).toEqual([])
    expect(draft.flightConditions).toEqual([])
    expect(draft.flagged).toBe(false)
    expect(draft).not.toHaveProperty('amendsEntryId')
    expect(draft).not.toHaveProperty('isVoid')
    expect(draft).not.toHaveProperty('id')
  })

  it('keeps FFS/FTD/ATD selected as 0 for simulator copies', () => {
    const source = entry({
      logbookType: 'simulator',
      flightTime: { ...createEmptyFlightTime(), ftd: 1.2, total: 1.2 },
    })
    const draft = buildDuplicatedDraft(source)
    expect(draft.logbookType).toBe('simulator')
    expect(draft.flightTime.ftd).toBe(0)
    expect(draft.flightTime.ffs).toBeNull()
    expect(draft.flightTime.atd).toBeNull()
    expect(draft.flightTime.total).toBeNull()
  })
})
