import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockUseRuntimeConfig = vi.fn()

vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig)

// Control platform detection so we can assert both native and web behavior.
const platform = vi.hoisted(() => ({ native: false }))
vi.mock('~/composables/useCapacitorPlatform', () => ({
  isCapacitorNative: () => platform.native,
}))

describe('resolveApiUrl', () => {
  beforeEach(() => {
    mockUseRuntimeConfig.mockReset()
    platform.native = false
  })

  it('returns non-api paths unchanged', async () => {
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/dashboard')).toBe('/dashboard')
  })

  it('prefixes /api paths with apiBase on the native app', async () => {
    platform.native = true
    mockUseRuntimeConfig.mockReturnValue({
      public: { apiBase: 'https://www.logifi.io' },
    })
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/api/fcv/status')).toBe('https://www.logifi.io/api/fcv/status')
  })

  it('keeps /api paths relative in the browser even when apiBase is set', async () => {
    platform.native = false
    mockUseRuntimeConfig.mockReturnValue({
      public: { apiBase: 'https://www.logifi.io' },
    })
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/api/fcv/status')).toBe('/api/fcv/status')
  })

  it('leaves /api paths relative when apiBase is empty', async () => {
    platform.native = true
    mockUseRuntimeConfig.mockReturnValue({
      public: { apiBase: '' },
    })
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/api/credits/balance')).toBe('/api/credits/balance')
  })

  it('strips trailing slash from apiBase on the native app', async () => {
    platform.native = true
    mockUseRuntimeConfig.mockReturnValue({
      public: { apiBase: 'https://www.logifi.io/' },
    })
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/api/digifi/scan')).toBe('https://www.logifi.io/api/digifi/scan')
  })
})
