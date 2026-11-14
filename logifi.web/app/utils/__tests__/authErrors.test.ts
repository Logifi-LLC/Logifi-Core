import { describe, expect, it } from 'vitest'
import {
  authEmailRateLimitUserMessage,
  isAuthEmailRateLimitError,
  isEmailNotConfirmedError,
  isPasswordResetEnumerationError,
  passwordResetErrorUserMessage,
  signInErrorUserMessage,
} from '../authErrors'

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

  it('detects password-reset rate limits and enumeration leaks', () => {
    expect(isAuthEmailRateLimitError('Email rate limit exceeded')).toBe(true)
    expect(isAuthEmailRateLimitError('For security purposes, you can only request this once every 60 seconds')).toBe(true)
    expect(isPasswordResetEnumerationError('User not found')).toBe(true)
    expect(passwordResetErrorUserMessage('Email rate limit exceeded')).toBe(
      authEmailRateLimitUserMessage()
    )
  })
})
