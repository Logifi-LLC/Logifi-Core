import { describe, expect, it } from 'vitest'
import { buildRepeatedEntry } from '../repeatFlight'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'

const source: LogEntry = {
  id: 'orig-1',
  date: '2024-06-14',
  role: 'PIC',
  aircraftCategoryClass: 'ASEL',
  categoryClassTime: 1.5,
  aircraftMakeModel: 'C172',
  registration: 'N12345',
  flightNumber: '1224',
  departure: 'KORD',
  destination: 'KMDW',
  route: 'KARR',
  trainingElements: 'Jane Smith',
  trainingInstructor: 'CFI Jones',
  instructorCertificate: 'CFI-123',
  flightConditions: ['nightVfr'],
  remarks: 'Pattern work',
  tags: ['IPC'],
  logbookType: 'flight',
  flightTime: { ...createEmptyFlightTime(), total: 1.5, pic: 1.5, night: 0.4 },
  performance: { ...createEmptyPerformance(), nightLandings: 3 },
  oooi: { out: '1800', off: '1812', on: '1930', in: '1938', isZulu: true },
  amendsEntryId: 'should-not-copy',
  isVoid: false,
  signaturePending: true,
  dataHash: 'abc',
  version: 2,
}

describe('buildRepeatedEntry', () => {
  it('copies aircraft, route, and crew and bumps the date', () => {
    const draft = buildRepeatedEntry(source, '2024-06-15')
    expect(draft.date).toBe('2024-06-15')
    expect(draft.registration).toBe('N12345')
    expect(draft.aircraftMakeModel).toBe('C172')
    expect(draft.departure).toBe('KORD')
    expect(draft.destination).toBe('KMDW')
    expect(draft.route).toBe('KARR')
    expect(draft.flightNumber).toBe('1224')
    expect(draft.trainingElements).toBe('Jane Smith')
    expect(draft.trainingInstructor).toBe('CFI Jones')
    expect(draft.instructorCertificate).toBe('CFI-123')
    expect(draft.role).toBe('PIC')
    expect(draft.flightConditions).toEqual(['nightVfr'])
    expect(draft.tags).toEqual(['IPC'])
    expect(draft.logbookType).toBe('flight')
  })

  it('clears times, OOOI, remarks, and amendment linkage', () => {
    const draft = buildRepeatedEntry(source, '2024-06-15')
    expect(draft.flightTime.total).toBeNull()
    expect(draft.flightTime.night).toBeNull()
    expect(draft.performance.nightLandings).toBeNull()
    expect(draft.categoryClassTime).toBeNull()
    expect(draft.oooi?.out).toBeNull()
    expect(draft.remarks).toBe('')
    expect(draft.amendsEntryId).toBeUndefined()
    expect(draft.isVoid).toBeUndefined()
    expect(draft.signaturePending).toBeUndefined()
    expect(draft.dataHash).toBeUndefined()
    expect(draft.version).toBeUndefined()
    expect(draft).not.toHaveProperty('id')
  })

  it('drops the Void tag so a repeated hop is a fresh entry', () => {
    const draft = buildRepeatedEntry({ ...source, tags: ['IPC', 'Void'] }, '2024-06-15')
    expect(draft.tags).toEqual(['IPC'])
  })
})
