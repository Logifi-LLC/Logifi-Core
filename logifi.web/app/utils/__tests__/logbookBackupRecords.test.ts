import { describe, expect, it } from 'vitest'
import {
  attachBackupSignaturesToEntries,
  backupSignaturesAreReadOnly,
  parseLogbookBackupExtras,
  sanitizeBackupFlightSignature,
} from '../logbookBackupRecords'
import { buildLogbookJsonBackupPayload, serializeLogbookJsonBackup } from '../logbookJsonBackup'

describe('logbook backup signature restore', () => {
  const signature = {
    logEntryId: 'entry-1',
    signerName: 'Pat Instructor',
    certificateNumber: '4170037',
    certificateExpiration: '2027-12-31',
    signedAt: '2026-03-01T12:00:00.000Z',
    drawnSignatureUrl: 'user/entry-1.png',
    signMethod: 'guest_drawn',
    electronicallySigned: true,
  }

  it('round-trips signatures as read-only display records', () => {
    const payload = buildLogbookJsonBackupPayload({
      entries: [{ id: 'entry-1', remarks: 'dual' }],
      pilotProfile: { name: 'Student Pilot' },
      endorsements: [],
      flightSignatures: [
        {
          ...signature,
          electronicallySigned: false,
        },
      ],
    })
    const parsed = JSON.parse(serializeLogbookJsonBackup(payload))
    const extras = parseLogbookBackupExtras(parsed)
    expect(extras.flightSignatures).toHaveLength(1)
    expect(backupSignaturesAreReadOnly(extras.flightSignatures)).toBe(true)
    expect(extras.flightSignatures[0]?.electronicallySigned).toBe(false)
  })

  it('keeps the original signature snapshot when the restored entry is edited', () => {
    const restored = sanitizeBackupFlightSignature(signature)
    expect(restored?.electronicallySigned).toBe(false)
    const [attached] = attachBackupSignaturesToEntries(
      [{ id: 'entry-1', remarks: 'dual received' }],
      restored ? [restored] : []
    )
    const edited = {
      ...attached,
      remarks: 'student edited remarks after restore',
    }
    expect(edited.importedSignatureDisplay).toEqual(restored)
    expect(edited.importedSignatureDisplay?.electronicallySigned).toBe(false)
    expect(restored?.signerName).toBe('Pat Instructor')
    expect(restored?.certificateNumber).toBe('4170037')
  })

  it('never treats a restored copy as an electronic signature', () => {
    const restored = sanitizeBackupFlightSignature({
      ...signature,
      electronicallySigned: true,
    })
    expect(restored?.electronicallySigned).toBe(false)
  })
})
