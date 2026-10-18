import { afterEach, describe, expect, it } from 'vitest'
import {
  clearReferralClaimRateLimitForTests,
  referralClaimRateLimitExceeded,
} from '../referralClaimRateLimit'

describe('referralClaimRateLimitExceeded', () => {
  afterEach(() => {
    clearReferralClaimRateLimitForTests()
  })

  it('allows up to 10 attempts per hour', () => {
    const userId = 'user-rate'
    const start = 1_700_000_000_000
    for (let i = 0; i < 10; i += 1) {
      expect(referralClaimRateLimitExceeded(userId, start + i)).toBe(false)
    }
    expect(referralClaimRateLimitExceeded(userId, start + 10)).toBe(true)
  })

  it('resets after the window', () => {
    const userId = 'user-window'
    const start = 1_700_000_000_000
    for (let i = 0; i < 10; i += 1) {
      referralClaimRateLimitExceeded(userId, start + i)
    }
    expect(referralClaimRateLimitExceeded(userId, start + 10)).toBe(true)
    expect(referralClaimRateLimitExceeded(userId, start + 60 * 60 * 1000 + 1)).toBe(false)
  })
})
