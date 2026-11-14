import { describe, expect, it } from 'vitest'
import {
  LOGBOOK_JSON_BACKUP_VERSION,
  buildLogbookJsonBackupPayload,
  entriesArrayFromJsonBackup,
  serializeLogbookJsonBackup,
} from '../logbookJsonBackup'

describe('logbookJsonBackup', () => {
  it('builds the canonical backup envelope', () => {
    const payload = buildLogbookJsonBackupPayload({
      entries: [{ id: 'e1', date: '2024-03-01' }],
      pilotProfile: { name: 'Pat Example' },
      exportedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(payload.version).toBe(LOGBOOK_JSON_BACKUP_VERSION)
    expect(payload.entries).toHaveLength(1)
    expect(payload.pilotProfile?.name).toBe('Pat Example')
    const roundTrip = JSON.parse(serializeLogbookJsonBackup(payload))
    expect(roundTrip.version).toBe('1.1')
  })

  it('reads entries from wrapped or raw arrays', () => {
    expect(entriesArrayFromJsonBackup({ entries: [{ id: 'a' }] })?.length).toBe(1)
    expect(entriesArrayFromJsonBackup([{ id: 'b' }])?.length).toBe(1)
    expect(entriesArrayFromJsonBackup({ foo: [] })).toBeNull()
  })
})