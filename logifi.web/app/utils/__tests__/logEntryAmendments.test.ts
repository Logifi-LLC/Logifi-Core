import { describe, expect, it } from 'vitest'
import { buildSupersededIdSet, buildVoidAmendment, isEntrySuperseded } from '../logEntryAmendments'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'
import {
  isMainInstructorRelationship,
  isRosterRelationshipSignable,
} from '../rosterRelationships'

const sample: LogEntry = {
  id: 'orig-1',
  date: '2026-07-01',
  role: 'Student',
  aircraftCategoryClass: 'ASEL',
  categoryClassTime: 1.2,
  aircraftMakeModel: 'C172',
  registration: 'N12345',
  departure: 'KPAO',
  destination: 'KSFO',
  route: '',
  trainingElements: '',
  trainingInstructor: '',
  instructorCertificate: '',
  flightConditions: [],
  remarks: 'Dual lesson',
  flightTime: { ...createEmptyFlightTime(), dual: 1.2, total: 1.2 },
  performance: createEmptyPerformance(),
}

describe('buildVoidAmendment', () => {
  it('zeros times, links original, and marks void', () => {
    const voided = buildVoidAmendment(sample, 'void-1', 'Created in error')
    expect(voided.id).toBe('void-1')
    expect(voided.amendsEntryId).toBe('orig-1')
    expect(voided.isVoid).toBe(true)
    expect(voided.flightTime.dual).toBeNull()
    expect(voided.flightTime.total).toBeNull()
    expect(voided.remarks).toContain('VOIDED: Created in error')
    expect(voided.tags).toContain('Void')
  })
})

describe('buildSupersededIdSet', () => {
  it('collects amended original ids in O(n)', () => {
    const amendment = { ...sample, id: 'amend-1', amendsEntryId: 'orig-1' }
    const other = { ...sample, id: 'other-1' }
    const set = buildSupersededIdSet([sample, amendment, other])
    expect(set.has('orig-1')).toBe(true)
    expect(set.has('other-1')).toBe(false)
    expect(set.has('amend-1')).toBe(false)
    expect(isEntrySuperseded('orig-1', [sample, amendment, other])).toBe(true)
  })
})

describe('isRosterRelationshipSignable', () => {
  it('allows ACTIVE links regardless of expires_at', () => {
    expect(isRosterRelationshipSignable({ status: 'ACTIVE' })).toBe(true)
    expect(
      isRosterRelationshipSignable({
        status: 'ACTIVE',
      } as { status: 'ACTIVE' })
    ).toBe(true)
  })

  it('rejects non-ACTIVE', () => {
    expect(isRosterRelationshipSignable({ status: 'PENDING' })).toBe(false)
  })
})

describe('isMainInstructorRelationship', () => {
  it('detects main kind', () => {
    expect(isMainInstructorRelationship({ relationship_kind: 'main' })).toBe(true)
    expect(isMainInstructorRelationship({ relationship_kind: 'linked' })).toBe(false)
  })
})
