import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../../app/utils/logbookTypes'
import { mergeRemoteLogEntries } from '../logEntryMerge'

function buildEntry(id: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id,
    date: '2026-05-26',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane SEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KLGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    tags: [],
    logbookType: 'flight',
    flightTime: {
      total: 1.2,
      pic: 1.2,
      sic: null,
      dual: null,
      solo: null,
      night: null,
      actualInstrument: null,
      simulatedInstrument: null,
      crossCountry: null,
      dualGiven: null,
    },
    performance: {
      dayTakeoffs: null,
      dayLandings: null,
      nightTakeoffs: null,
      nightLandings: null,
      approachCount: null,
      holdingProcedures: null,
      approaches: [],
    },
    flagged: false,
    isImported: false,
    ...overrides,
  }
}

describe('mergeRemoteLogEntries', () => {
  it('removes synced local entries missing from remote', () => {
    const local = [{ entry: buildEntry('synced-1'), synced: true }]
    const result = mergeRemoteLogEntries({
      localEntries: local,
      remoteEntries: [],
      syncQueue: [],
    })

    expect(result.removedEntryIds).toEqual(['synced-1'])
    expect(result.mergedEntries).toEqual([])
  })

  it('keeps unsynced local entries missing from remote', () => {
    const offlineEntry = buildEntry('offline-1')
    const result = mergeRemoteLogEntries({
      localEntries: [{ entry: offlineEntry, synced: false }],
      remoteEntries: [],
      syncQueue: [],
    })

    expect(result.removedEntryIds).toEqual([])
    expect(result.mergedEntries).toEqual([offlineEntry])
  })

  it('keeps locals with pending insert in sync queue even when synced flag is true', () => {
    const pending = buildEntry('pending-insert')
    const result = mergeRemoteLogEntries({
      localEntries: [{ entry: pending, synced: true }],
      remoteEntries: [],
      syncQueue: [{ operation: 'insert', entryId: 'pending-insert' }],
    })

    expect(result.removedEntryIds).toEqual([])
    expect(result.mergedEntries.map((e) => e.id)).toEqual(['pending-insert'])
  })

  it('removes synced local with pending update when remotely deleted (delete wins)', () => {
    const result = mergeRemoteLogEntries({
      localEntries: [{ entry: buildEntry('deleted-remote'), synced: true }],
      remoteEntries: [],
      syncQueue: [{ operation: 'update', entryId: 'deleted-remote' }],
    })

    expect(result.removedEntryIds).toEqual(['deleted-remote'])
    expect(result.mergedEntries).toEqual([])
  })

  it('merges remote updates with last-write-wins when both sides exist', () => {
    const local = buildEntry('shared', { version: 1, updatedAt: '2026-01-01T00:00:00Z' })
    const remote = buildEntry('shared', {
      version: 2,
      updatedAt: '2026-02-01T00:00:00Z',
      remarks: 'from server',
    })

    const result = mergeRemoteLogEntries({
      localEntries: [{ entry: local, synced: true }],
      remoteEntries: [remote],
      syncQueue: [],
    })

    expect(result.removedEntryIds).toEqual([])
    expect(result.mergedEntries[0]?.remarks).toBe('from server')
  })

  it('adds remote-only entries not present locally', () => {
    const remote = buildEntry('remote-only')
    const result = mergeRemoteLogEntries({
      localEntries: [],
      remoteEntries: [remote],
      syncQueue: [],
    })

    expect(result.removedEntryIds).toEqual([])
    expect(result.mergedEntries).toEqual([remote])
  })

  it('purges all synced locals when remote list is empty', () => {
    const result = mergeRemoteLogEntries({
      localEntries: [
        { entry: buildEntry('a'), synced: true },
        { entry: buildEntry('b'), synced: false },
      ],
      remoteEntries: [],
      syncQueue: [],
    })

    expect(result.removedEntryIds).toEqual(['a'])
    expect(result.mergedEntries.map((e) => e.id)).toEqual(['b'])
  })
})
