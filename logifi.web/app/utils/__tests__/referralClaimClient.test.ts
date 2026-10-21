import { afterEach, describe, expect, it } from 'vitest'
import {
  persistedClaimAttemptKey,
  readPersistedClaimAttempt,
  writePersistedClaimAttempt,
} from '../referralClaimAttempt'
import { claimResultMessage } from '../referralClaimClient'

describe('referral claim client', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('persists claim attempt per account', () => {
    const key = persistedClaimAttemptKey('user-1')
    expect(readPersistedClaimAttempt('user-1')).toBe('idle')
    writePersistedClaimAttempt('user-1', 'done')
    expect(window.localStorage.getItem(key)).toBe('done')
    expect(readPersistedClaimAttempt('user-1')).toBe('done')
    writePersistedClaimAttempt('user-1', 'idle')
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('shows passive success only when a stored code was applied', () => {
    expect(
      claimResultMessage(
        { ok: true, attributed: true, friendCreditsGranted: false },
        { emailVerified: true, hadStoredCode: false }
      )
    ).toBeNull()
    expect(
      claimResultMessage(
        { ok: true, attributed: true, friendCreditsGranted: false },
        { emailVerified: true, hadStoredCode: true }
      )
    ).toBe('Referral applied')
    expect(
      claimResultMessage(
        { ok: true, attributed: true, friendCreditsGranted: true },
        { emailVerified: true, hadStoredCode: false }
      )
    ).toBe('5 credits added')
  })

  it('keeps interactive errors visible and silences passive blocks', () => {
    expect(
      claimResultMessage(
        { ok: false, attributed: true, reason: 'already_referred' },
        { interactive: false }
      )
    ).toBeNull()
    expect(
      claimResultMessage(
        { ok: false, attributed: false, reason: 'already_referred' },
        { interactive: true }
      )
    ).toBe('Referral already applied')
    expect(
      claimResultMessage(
        { ok: false, attributed: false, reason: 'self' },
        { interactive: false }
      )
    ).toBeNull()
  })
})
