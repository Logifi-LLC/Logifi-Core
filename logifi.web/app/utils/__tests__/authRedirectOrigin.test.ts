import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorNative: vi.fn(() => false),
}))

describe('authRedirectOrigin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses window.location.origin on web', async () => {
    const { getAuthRedirectOrigin, buildAuthCallbackUrl, buildResetPasswordUrl } = await import(
      '../authRedirectOrigin'
    )
    expect(getAuthRedirectOrigin()).toBe('http://localhost:3000')
    expect(buildAuthCallbackUrl()).toBe('http://localhost:3000/auth/callback')
    expect(buildResetPasswordUrl()).toBe('http://localhost:3000/reset-password')
  })

  it('uses the custom URL scheme on native, not https://localhost', async () => {
    const platform = await import('~/composables/useCapacitorPlatform')
    vi.mocked(platform.isCapacitorNative).mockReturnValue(true)

    vi.resetModules()
    const {
      getAuthRedirectOrigin,
      buildAuthCallbackUrl,
      buildResetPasswordUrl,
      CAPACITOR_AUTH_ORIGIN,
      CAPACITOR_AUTH_SCHEME,
    } = await import('../authRedirectOrigin')
    expect(CAPACITOR_AUTH_ORIGIN).toBe('https://localhost')
    expect(CAPACITOR_AUTH_SCHEME).toBe('io.logifi.app')
    expect(getAuthRedirectOrigin()).toBe('io.logifi.app://')
    expect(buildAuthCallbackUrl()).toBe('io.logifi.app://auth/callback')
    expect(buildResetPasswordUrl()).toBe('io.logifi.app://reset-password')
  })

  it('maps custom-scheme auth URLs to in-app paths', async () => {
    const { pathFromAuthDeepLink } = await import('../authRedirectOrigin')
    expect(pathFromAuthDeepLink('io.logifi.app://auth/callback?code=abc')).toBe(
      '/auth/callback?code=abc'
    )
    expect(pathFromAuthDeepLink('io.logifi.app://reset-password#access_token=tok')).toBe(
      '/reset-password#access_token=tok'
    )
    expect(pathFromAuthDeepLink('https://localhost/auth/callback?code=abc')).toBe(
      '/auth/callback?code=abc'
    )
    expect(pathFromAuthDeepLink('io.logifi.app://dashboard?fcv=connected')).toBe(
      '/dashboard?fcv=connected'
    )
    expect(pathFromAuthDeepLink('https://www.logifi.io/auth/callback')).toBeNull()
  })
})
