import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorNative: vi.fn(() => false),
}))

describe('authRedirectOrigin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses window.location.origin on web', async () => {
    const { getAuthRedirectOrigin, buildAuthCallbackUrl } = await import('../authRedirectOrigin')
    expect(getAuthRedirectOrigin()).toBe('http://localhost:3000')
    expect(buildAuthCallbackUrl()).toBe('http://localhost:3000/auth/callback')
  })

  it('uses Capacitor localhost origin on native', async () => {
    const platform = await import('~/composables/useCapacitorPlatform')
    vi.mocked(platform.isCapacitorNative).mockReturnValue(true)

    vi.resetModules()
    const { getAuthRedirectOrigin, buildAuthCallbackUrl, CAPACITOR_AUTH_ORIGIN } = await import(
      '../authRedirectOrigin'
    )
    expect(CAPACITOR_AUTH_ORIGIN).toBe('https://localhost')
    expect(getAuthRedirectOrigin()).toBe('https://localhost')
    expect(buildAuthCallbackUrl()).toBe('https://localhost/auth/callback')
  })
})
