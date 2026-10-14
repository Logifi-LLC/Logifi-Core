import { afterEach, describe, expect, it } from 'vitest'
import { REFERRAL_STORAGE_KEY, referralCodeFromBody } from '../../../shared/referrals'
import {
  captureReferralFromSearch,
  clearStoredReferralCode,
  readStoredReferralCode,
  shareUrlForClient,
  storeReferralCode,
} from '../referralCapture'
import {
  messageFromClaimError,
  nextClaimAttempt,
  shouldClaimReferral,
  shouldClearStoredReferral,
} from '../referralClaimAttempt'

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

  it('shares the current web origin and www from the native app', () => {
    expect(shareUrlForClient('ABCD234H', false, 'https://preview.example')).toBe(
      'https://preview.example/?ref=ABCD234H'
    )
    expect(shareUrlForClient('ABCD234H', true, 'https://localhost')).toBe(
      'https://www.logifi.io/?ref=ABCD234H'
    )
  })

  it('keeps a stored code when the signed-in referrer opens their own link', () => {
    expect(shouldClearStoredReferral({ attributed: false, reason: 'self' })).toBe(false)
    expect(shouldClearStoredReferral({ attributed: true })).toBe(true)
    expect(shouldClearStoredReferral({ attributed: false, reason: 'unknown_code' })).toBe(true)
  })

  it('reads a referral code from a JSON string body and surfaces server errors', () => {
    expect(referralCodeFromBody({ code: 'ABCD234H' })).toBe('ABCD234H')
    expect(referralCodeFromBody('{"code":"ABCD234H"}')).toBe('ABCD234H')
    expect(referralCodeFromBody('not-json')).toBeNull()
    expect(
      messageFromClaimError({
        data: { statusMessage: 'Referral save was denied. The server key cannot write referral rows.' },
      })
    ).toBe('Referral save was denied. The server key cannot write referral rows.')
  })

  it('claims again after email verification in a later session', () => {
    expect(shouldClaimReferral('idle', false)).toBe(true)
    expect(shouldClaimReferral('awaiting-verify', false)).toBe(false)
    expect(shouldClaimReferral('awaiting-verify', true)).toBe(true)
    expect(shouldClaimReferral('done', true)).toBe(false)
    expect(
      nextClaimAttempt({ emailVerified: false, attributed: true, friendCreditsGranted: false })
    ).toBe('awaiting-verify')
    expect(
      nextClaimAttempt({ emailVerified: true, attributed: true, friendCreditsGranted: true })
    ).toBe('done')
  })
})
