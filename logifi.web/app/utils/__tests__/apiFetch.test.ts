import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockUseRuntimeConfig = vi.fn()

vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig)

describe('resolveApiUrl', () => {
  beforeEach(() => {
    mockUseRuntimeConfig.mockReset()
  })

  it('returns non-api paths unchanged', async () => {
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/dashboard')).toBe('/dashboard')
  })

  it('prefixes /api paths when apiBase is set', async () => {
    mockUseRuntimeConfig.mockReturnValue({
      public: { apiBase: 'https://www.logifi.io' },
    })
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/api/fcv/status')).toBe('https://www.logifi.io/api/fcv/status')
  })

  it('leaves /api paths relative when apiBase is empty', async () => {
    mockUseRuntimeConfig.mockReturnValue({
      public: { apiBase: '' },
    })
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/api/credits/balance')).toBe('/api/credits/balance')
  })

  it('strips trailing slash from apiBase', async () => {
    mockUseRuntimeConfig.mockReturnValue({
      public: { apiBase: 'https://www.logifi.io/' },
    })
    const { resolveApiUrl } = await import('../apiFetch')
    expect(resolveApiUrl('/api/digifi/scan')).toBe('https://www.logifi.io/api/digifi/scan')
  })
})
