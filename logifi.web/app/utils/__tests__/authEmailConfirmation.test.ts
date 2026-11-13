import { describe, expect, it } from 'vitest'
import {
  friendlyAuthRateLimitMessage,
  friendlyResendAuthError,
  friendlySignInError,
  isEmailNotConfirmedMessage,
} from '../authEmailConfirmation'

describe('isEmailNotConfirmedMessage', () => {
  it('detects Supabase email confirmation gate', () => {
    expect(isEmailNotConfirmedMessage('Email not confirmed')).toBe(true)
    expect(isEmailNotConfirmedMessage('Invalid login credentials')).toBe(false)
  })
})

describe('friendlyAuthRateLimitMessage', () => {
  it('maps rate limit errors', () => {
    expect(
      friendlyAuthRateLimitMessage(
        'For security purposes, you can only request this once every 60 seconds'
      )
    ).toBe('Too many emails sent. Wait a minute and try again.')
    expect(friendlyAuthRateLimitMessage('Invalid email')).toBeNull()
  })
})

describe('friendlyResendAuthError', () => {
  it('prefers rate-limit copy', () => {
    expect(friendlyResendAuthError(new Error('over_email_send_rate_limit'))).toBe(
      'Too many emails sent. Wait a minute and try again.'
    )
  })
})

describe('friendlySignInError', () => {
  it('points unconfirmed users to resend', () => {
    expect(friendlySignInError(new Error('Email not confirmed'))).toContain('resend')
  })
})
