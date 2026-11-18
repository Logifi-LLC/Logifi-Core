import { describe, expect, it } from 'vitest'
import {
  assertCanUnlinkIdentity,
  canUnlinkIdentity,
  hasEmailIdentity,
  isAppleOnlyIdentities,
  isApplePrivateRelayEmail,
  isGoogleOnlyIdentities,
  LAST_IDENTITY_GUARD_MESSAGE,
  shouldRequireCurrentPassword,
} from '../authIdentities'

const emailIdentity = { provider: 'email', identity_data: { email: 'pilot.jane@example.com' } }
const appleIdentity = {
  provider: 'apple',
  identity_data: { email: 'hide-pilot@privaterelay.appleid.com' },
}
const googleIdentity = { provider: 'google', identity_data: { email: 'pilot.jane@gmail.com' } }

describe('identity detection', () => {
  it('detects an email identity', () => {
    expect(hasEmailIdentity([emailIdentity])).toBe(true)
    expect(hasEmailIdentity([appleIdentity, emailIdentity])).toBe(true)
    expect(hasEmailIdentity([appleIdentity])).toBe(false)
    expect(hasEmailIdentity([])).toBe(false)
    expect(hasEmailIdentity(undefined)).toBe(false)
  })

  it('detects Apple-only accounts', () => {
    expect(isAppleOnlyIdentities([appleIdentity])).toBe(true)
    expect(isAppleOnlyIdentities([appleIdentity, appleIdentity])).toBe(true)
    expect(isAppleOnlyIdentities([appleIdentity, googleIdentity])).toBe(false)
    expect(isAppleOnlyIdentities([emailIdentity])).toBe(false)
    expect(isAppleOnlyIdentities([])).toBe(false)
  })

  it('detects Google-only accounts', () => {
    expect(isGoogleOnlyIdentities([googleIdentity])).toBe(true)
    expect(isGoogleOnlyIdentities([googleIdentity, appleIdentity])).toBe(false)
    expect(isGoogleOnlyIdentities([emailIdentity])).toBe(false)
    expect(isGoogleOnlyIdentities([])).toBe(false)
  })

  it('requires a current password for email identities, including app_metadata fallback', () => {
    expect(shouldRequireCurrentPassword([emailIdentity])).toBe(true)
    expect(shouldRequireCurrentPassword([appleIdentity])).toBe(false)
    expect(shouldRequireCurrentPassword([googleIdentity])).toBe(false)
    expect(shouldRequireCurrentPassword([], { providers: ['email'] })).toBe(true)
    expect(shouldRequireCurrentPassword([appleIdentity], { providers: ['apple'] })).toBe(false)
  })

  it('detects Apple Hide My Email relay addresses', () => {
    expect(isApplePrivateRelayEmail('hide-pilot@privaterelay.appleid.com')).toBe(true)
    expect(isApplePrivateRelayEmail('HIDE-PILOT@PrivateRelay.AppleID.com')).toBe(true)
    expect(isApplePrivateRelayEmail('pilot.jane@example.com')).toBe(false)
    expect(isApplePrivateRelayEmail('')).toBe(false)
    expect(isApplePrivateRelayEmail(null)).toBe(false)
  })
})

describe('last-identity guard', () => {
  it('blocks unlinking the last remaining identity', () => {
    expect(canUnlinkIdentity([appleIdentity])).toBe(false)
    expect(canUnlinkIdentity([])).toBe(false)
    expect(assertCanUnlinkIdentity([googleIdentity])).toEqual({
      ok: false,
      error: LAST_IDENTITY_GUARD_MESSAGE,
    })
  })

  it('allows unlink when at least two identities are connected', () => {
    expect(canUnlinkIdentity([appleIdentity, googleIdentity])).toBe(true)
    expect(canUnlinkIdentity([appleIdentity, emailIdentity, googleIdentity])).toBe(true)
    expect(assertCanUnlinkIdentity([appleIdentity, emailIdentity])).toEqual({ ok: true })
  })
})
