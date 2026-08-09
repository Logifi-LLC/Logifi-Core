import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../../app/utils/logbookTypes'
import {
  applyTombstoneDeletions,
  computeRemoteSyncWatermark,
  DELTA_FALLBACK_THRESHOLD,
  mergeWatermarks,
  subtractOverlapFromIso,
} from '../logEntrySync'
import { mergeRemoteLogEntries } from '../logEntryMerge'

function buildEntry(id: string, updatedAt?: string): LogEntry {
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
    updatedAt,
  }
}

describe('logEntrySync utilities', () => {
  it('uses a high delta fallback threshold so moderate imports stay on the delta path', () => {
    expect(DELTA_FALLBACK_THRESHOLD).toBeGreaterThanOrEqual(2000)
  })

  it('subtractOverlapFromIso moves the watermark back in time', () => {
    const result = subtractOverlapFromIso('2026-01-01T01:00:00.000Z', 60_000)
    expect(result).toBe('2026-01-01T00:59:00.000Z')
  })

  it('computeRemoteSyncWatermark picks the latest entry or tombstone timestamp', () => {
    const watermark = computeRemoteSyncWatermark(
      [buildEntry('a', '2026-01-01T00:00:00.000Z'), buildEntry('b', '2026-02-01T00:00:00.000Z')],
      [{ entryId: 'deleted', deletedAt: '2026-03-01T00:00:00.000Z' }]
    )
    expect(watermark).toBe('2026-03-01T00:00:00.000Z')
  })

  it('mergeWatermarks keeps the newer ISO timestamp', () => {
    expect(mergeWatermarks('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')).toBe(
      '2026-02-01T00:00:00.000Z'
    )
    expect(mergeWatermarks('2026-03-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')).toBe(
      '2026-03-01T00:00:00.000Z'
    )
  })

  it('applyTombstoneDeletions removes synced entries but keeps pending inserts', () => {
    const entries = [buildEntry('gone'), buildEntry('pending')]
    const result = applyTombstoneDeletions(entries, ['gone', 'pending'], [
      { operation: 'insert', entryId: 'pending' },
    ])

    expect(result.removedEntryIds).toEqual(['gone'])
    expect(result.mergedEntries.map((entry) => entry.id)).toEqual(['pending'])
  })

  it('applyTombstoneDeletions is a no-op without tombstones', () => {
    const entries = [buildEntry('keep')]
    const result = applyTombstoneDeletions(entries, [], [])
    expect(result.removedEntryIds).toEqual([])
    expect(result.mergedEntries).toEqual(entries)
  })

  it('simulates device B delta pull after device A deletes an entry', () => {
    const localOnDeviceB = [buildEntry('stay', '2026-01-01T00:00:00.000Z'), buildEntry('gone', '2026-01-01T00:00:00.000Z')]
    const tombstones = [{ entryId: 'gone', deletedAt: '2026-06-01T00:00:00.000Z' }]

    const afterDelete = applyTombstoneDeletions(localOnDeviceB, tombstones.map((t) => t.entryId), [])
    const watermark = computeRemoteSyncWatermark([], tombstones)

    expect(afterDelete.removedEntryIds).toEqual(['gone'])
    expect(afterDelete.mergedEntries.map((entry) => entry.id)).toEqual(['stay'])
    expect(watermark).toBe('2026-06-01T00:00:00.000Z')
  })

  it('simulates device B delta pull after device A updates an entry', () => {
    const localOnDeviceB = [buildEntry('shared', '2026-01-01T00:00:00.000Z')]
    const remoteDelta = [buildEntry('shared', '2026-06-01T00:00:00.000Z')]

    const merged = mergeRemoteLogEntries({
      localEntries: localOnDeviceB.map((entry) => ({ entry, synced: true })),
      remoteEntries: remoteDelta,
      syncQueue: [],
      reconcileRemoteDeletes: false,
    })

    const watermark = computeRemoteSyncWatermark(remoteDelta, [])
    expect(merged.mergedEntries[0]?.updatedAt).toBe('2026-06-01T00:00:00.000Z')
    expect(watermark).toBe('2026-06-01T00:00:00.000Z')
  })
})
