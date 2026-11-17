import { describe, expect, it, vi } from 'vitest'
import {
  ensureAccountChangeVerified,
  isReauthenticationRequiredError,
  validateEmailChangeInput,
  validatePasswordChangeInput,
} from '../accountCredentialUpdate'

describe('ensureAccountChangeVerified', () => {
  it('requires the current password for email/password users', async () => {
    const signInWithPassword = vi.fn(async () => ({ error: null }))
    const result = await ensureAccountChangeVerified(
      {
        signInWithPassword,
        refreshSession: vi.fn(),
        reauthenticate: vi.fn(),
      },
      {
        identities: [{ provider: 'email' }],
        currentPassword: 'hunter2-not-used-as-secret',
        nonce: '',
        userEmail: 'pilot.jane@example.com',
      }
    )
    expect(result).toEqual({ ok: true })
    expect(signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('does not skip password verification when the email identity is present', async () => {
    const result = await ensureAccountChangeVerified(
      {
        signInWithPassword: vi.fn(),
        refreshSession: vi.fn(),
        reauthenticate: vi.fn(),
      },
      {
        identities: [{ provider: 'email' }, { provider: 'google' }],
        currentPassword: '',
        nonce: '',
        userEmail: 'pilot.jane@example.com',
      }
    )
    expect(result).toEqual({ ok: false, error: 'Please enter your current password.' })
  })

  it('refreshes the session for Apple-only users instead of asking for a password', async () => {
    const refreshSession = vi.fn(async () => ({ error: null }))
    const signInWithPassword = vi.fn()
    const result = await ensureAccountChangeVerified(
      {
        signInWithPassword,
        refreshSession,
        reauthenticate: vi.fn(),
      },
      {
        identities: [{ provider: 'apple' }],
        currentPassword: '',
        nonce: '',
        userEmail: 'hide-pilot@privaterelay.appleid.com',
      }
    )
    expect(result).toEqual({ ok: true })
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('requests a reauthenticate nonce for Google-only users when a fresh session is not enough', async () => {
    const reauthenticate = vi.fn(async () => ({ error: null }))
    const result = await ensureAccountChangeVerified(
      {
        signInWithPassword: vi.fn(),
        refreshSession: vi.fn(async () => ({ error: { message: 'session expired' } })),
        reauthenticate,
      },
      {
        identities: [{ provider: 'google' }],
        currentPassword: '',
        nonce: '',
        userEmail: 'pilot.jane@gmail.com',
      }
    )
    expect(reauthenticate).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      ok: false,
      needsNonce: true,
      error: 'Enter the confirmation code we just sent to your current email.',
    })
  })
})

describe('input validation', () => {
  it('rejects an unchanged or empty email', () => {
    expect(
      validateEmailChangeInput({
        nextEmail: 'pilot.jane@example.com',
        currentEmail: 'pilot.jane@example.com',
      })
    ).toEqual({ ok: false, error: 'That is already your current email.' })
    expect(validateEmailChangeInput({ nextEmail: '' })).toEqual({
      ok: false,
      error: 'Please enter an email address.',
    })
  })

  it('requires matching passwords of at least 8 characters', () => {
    expect(
      validatePasswordChangeInput({ newPassword: 'short', confirmPassword: 'short' })
    ).toEqual({ ok: false, error: 'New password must be at least 8 characters.' })
    expect(
      validatePasswordChangeInput({
        newPassword: 'long-enough',
        confirmPassword: 'different',
      })
    ).toEqual({ ok: false, error: 'New password and confirmation do not match.' })
  })
})

describe('isReauthenticationRequiredError', () => {
  it('detects nonce and AAL errors from Auth', () => {
    expect(isReauthenticationRequiredError('AAL2 required')).toBe(true)
    expect(isReauthenticationRequiredError('Nonce is required')).toBe(true)
    expect(isReauthenticationRequiredError('invalid email')).toBe(false)
  })
})
