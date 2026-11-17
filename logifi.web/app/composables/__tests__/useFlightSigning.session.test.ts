import { describe, expect, it } from 'vitest'
import { clearFlightSigningSessionCache, useFlightSigning } from '../useFlightSigning'

describe('useFlightSigning session cache', () => {
  it('clearFlightSigningSessionCache empties module-level signature maps', () => {
    const signing = useFlightSigning()
    signaturesByEntryIdSetFixture(signing)
    clearFlightSigningSessionCache()
    expect(signing.signaturesByEntryId.value).toEqual({})
    expect(signing.pendingSignatures.value).toEqual([])
  })
})

function signaturesByEntryIdSetFixture(
  signing: ReturnType<typeof useFlightSigning>
): void {
  signing.signaturesByEntryId.value = {
    '11111111-1111-1111-1111-111111111111': {
      id: '11111111-1111-1111-1111-111111111111',
      log_entry_id: '22222222-2222-2222-2222-222222222222',
    } as never,
  }
  signing.pendingSignatures.value = [
    { log_entry_id: '22222222-2222-2222-2222-222222222222' } as never,
  ]
}