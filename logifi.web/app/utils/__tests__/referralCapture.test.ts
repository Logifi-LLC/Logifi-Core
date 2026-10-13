import { afterEach, describe, expect, it } from 'vitest'
import { REFERRAL_STORAGE_KEY } from '../../../shared/referrals'
import {
  captureReferralFromSearch,
  clearStoredReferralCode,
  readStoredReferralCode,
  storeReferralCode,
} from '../referralCapture'

describe('referral capture', () => {
  afterEach(() => {
    window.localStorage.clear()
    document.cookie = 'logifi_ref=; Path=/; Max-Age=0'
  })

  it('reads ref from the landing URL and ignores a bad code', () => {
    expect(captureReferralFromSearch('?ref=abcd234h&utm=1')).toBe('ABCD234H')
    expect(captureReferralFromSearch('?ref=nope')).toBeNull()
  })

  it('persists the code in localStorage and a cookie until cleared', () => {
    storeReferralCode('abcd234h')
    expect(window.localStorage.getItem(REFERRAL_STORAGE_KEY)).toBe('ABCD234H')
    expect(document.cookie).toContain('logifi_ref=ABCD234H')
    expect(readStoredReferralCode()).toBe('ABCD234H')

    window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
    expect(readStoredReferralCode()).toBe('ABCD234H')

    clearStoredReferralCode()
    expect(readStoredReferralCode()).toBeNull()
  })
})
