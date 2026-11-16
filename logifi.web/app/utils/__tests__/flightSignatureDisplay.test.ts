import { describe, expect, it } from 'vitest'
import { formatFlightSignatureBlock, flightSignatureFromRow } from '../flightSignatureDisplay'

describe('flightSignatureDisplay', () => {
  it('shows name, certificate number, expiration, and signed date', () => {
    const block = formatFlightSignatureBlock(
      flightSignatureFromRow({
        log_entry_id: 'entry-1',
        signer_name: 'Pat Instructor',
        signer_certificate_number: '4170037',
        signer_certificate_expiration: '2027-12-31',
        signed_at: '2026-03-01T12:00:00.000Z',
        sign_method: 'roster_pin',
      })
    )
    expect(block).toContain('/s/ Pat Instructor')
    expect(block).toContain('4170037')
    expect(block).toContain('Exp. 12/31/2027')
    expect(block).toContain('03/01/2026')
  })
})
