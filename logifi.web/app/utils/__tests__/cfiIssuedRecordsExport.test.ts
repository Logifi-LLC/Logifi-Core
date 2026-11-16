import { describe, expect, it } from 'vitest'
import { buildCfiIssuedRecordsCsv, isWithinCfiLookback } from '../cfiIssuedRecordsExport'

describe('cfi issued records export', () => {
  it('includes only the last three years', () => {
    const now = new Date('2026-11-16T00:00:00.000Z')
    expect(isWithinCfiLookback('2024-01-01T00:00:00.000Z', now)).toBe(true)
    expect(isWithinCfiLookback('2022-11-15T00:00:00.000Z', now)).toBe(false)
  })

  it('writes CSV rows for endorsements and signatures in range', () => {
    const now = new Date('2026-11-16T00:00:00.000Z')
    const csv = buildCfiIssuedRecordsCsv({
      now,
      endorsements: [
        {
          id: 'end-1',
          signed_at: '2025-01-02T00:00:00.000Z',
          title: 'Solo',
          template_code: 'A.1',
          instructor_full_name: 'Pat Instructor',
          cfi_number: '4170037',
          cfi_expiration: '2027-12-31',
        },
      ],
      signatures: [
        {
          logEntryId: 'entry-1',
          signerName: 'Pat Instructor',
          certificateNumber: '4170037',
          certificateExpiration: '2027-12-31',
          signedAt: '2025-06-01T00:00:00.000Z',
          drawnSignatureUrl: null,
          signMethod: 'roster_pin',
          electronicallySigned: true,
        },
      ],
    })
    expect(csv).toContain('endorsement')
    expect(csv).toContain('flight_signature')
    expect(csv).toContain('4170037')
  })
})
