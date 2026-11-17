import { afterEach, describe, expect, it } from 'vitest'
import {
  clearSignatureRequestRateLimitForTests,
  signatureRequestRateLimitExceeded,
} from '../signatureRequestRateLimit'

describe('signatureRequestRateLimitExceeded', () => {
  afterEach(() => {
    clearSignatureRequestRateLimitForTests()
  })

  it('rate-limits repeat requests for the same entry', () => {
    const now = 1_000_000
    expect(
      signatureRequestRateLimitExceeded({
        userId: 'student-1',
        entryId: 'entry-1',
        nowMs: now,
      })
    ).toBeNull()
    expect(
      signatureRequestRateLimitExceeded({
        userId: 'student-1',
        entryId: 'entry-1',
        nowMs: now + 1_000,
      })
    ).toBe('entry')
  })
})
