import { describe, expect, it } from 'vitest'
import { isEmailNotConfirmedError, signInErrorUserMessage } from '../authErrors'

describe('authErrors', () => {
  it('detects email-not-confirmed variants', () => {
    expect(isEmailNotConfirmedError('Email not confirmed')).toBe(true)
    expect(isEmailNotConfirmedError('email not verified')).toBe(true)
    expect(isEmailNotConfirmedError('Invalid login credentials')).toBe(false)
  })

  it('returns actionable copy for unconfirmed email', () => {
    expect(signInErrorUserMessage('Email not confirmed')).toContain('resend')
    expect(signInErrorUserMessage('bad password')).toBe('bad password')
  })
})
