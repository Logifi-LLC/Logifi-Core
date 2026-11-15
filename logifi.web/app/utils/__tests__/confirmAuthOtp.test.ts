import { describe, expect, it, vi } from 'vitest'
import {
  AUTH_CONFIRM_RECOVERY_NEXT,
  confirmAuthOtp,
  safeAuthNextPath,
} from '../confirmAuthOtp'

const TOKEN_HASH = 'th_test_recovery_7f3a'

function verifyOk() {
  return vi.fn(async () => ({ error: null }))
}

describe('safeAuthNextPath', () => {
  it('keeps a same-origin relative path', () => {
    expect(safeAuthNextPath('/reset-password', '/dashboard')).toBe('/reset-password')
    expect(safeAuthNextPath('/dashboard?tab=hours', '/reset-password')).toBe(
      '/dashboard?tab=hours'
    )
  })

  it('rejects open redirects', () => {
    const fallback = AUTH_CONFIRM_RECOVERY_NEXT
    expect(safeAuthNextPath('https://evil.example/phish', fallback)).toBe(fallback)
    expect(safeAuthNextPath('http://evil.example', fallback)).toBe(fallback)
    expect(safeAuthNextPath('//evil.example', fallback)).toBe(fallback)
    expect(safeAuthNextPath('/\\evil.example', fallback)).toBe(fallback)
    expect(safeAuthNextPath('javascript:alert(1)', fallback)).toBe(fallback)
    expect(safeAuthNextPath('/%2f%2fevil.example', fallback)).toBe(fallback)
  })
})

describe('confirmAuthOtp', () => {
  it('verifies a recovery token and routes to reset-password', async () => {
    const verifyOtp = verifyOk()
    const result = await confirmAuthOtp({
      tokenHash: TOKEN_HASH,
      type: 'recovery',
      next: '/reset-password',
      verifyOtp,
    })
    expect(result).toEqual({
      ok: true,
      type: 'recovery',
      nextPath: '/reset-password',
    })
    expect(verifyOtp).toHaveBeenCalledOnce()
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: TOKEN_HASH,
      type: 'recovery',
    })
  })

  it('rejects a type that is not recovery, signup, email, or email_change', async () => {
    const verifyOtp = verifyOk()
    const result = await confirmAuthOtp({
      tokenHash: TOKEN_HASH,
      type: 'magiclink',
      next: '/reset-password',
      verifyOtp,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('bad_type')
      expect(result.message).toContain('not a password reset')
    }
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('rejects a missing token_hash', async () => {
    const verifyOtp = verifyOk()
    const result = await confirmAuthOtp({
      tokenHash: '   ',
      type: 'recovery',
      next: '/reset-password',
      verifyOtp,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('missing_token')
      expect(result.message).toContain('missing information')
    }
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('maps an expired or invalid token to an actionable error', async () => {
    const verifyOtp = vi.fn(async () => ({
      error: { message: 'Token has expired or is invalid' },
    }))
    const result = await confirmAuthOtp({
      tokenHash: TOKEN_HASH,
      type: 'recovery',
      next: '/reset-password',
      verifyOtp,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('verify_failed')
      expect(result.message).toContain('expired')
      expect(result.message).not.toContain(TOKEN_HASH)
    }
  })

  it('maps a generic verify error without leaking internals', async () => {
    const verifyOtp = vi.fn(async () => ({
      error: { message: 'Auth API 500 from project-ref xyz' },
    }))
    const result = await confirmAuthOtp({
      tokenHash: TOKEN_HASH,
      type: 'recovery',
      next: '/reset-password',
      verifyOtp,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe('Could not verify this link. Request a new reset link.')
      expect(result.message).not.toContain('project-ref')
      expect(result.message).not.toContain(TOKEN_HASH)
    }
  })

  it('ignores a malicious next and still completes recovery', async () => {
    const verifyOtp = verifyOk()
    const result = await confirmAuthOtp({
      tokenHash: TOKEN_HASH,
      type: 'recovery',
      next: 'https://evil.example/phish',
      verifyOtp,
    })
    expect(result).toEqual({
      ok: true,
      type: 'recovery',
      nextPath: '/reset-password',
    })
    expect(verifyOtp).toHaveBeenCalledOnce()
  })
})
