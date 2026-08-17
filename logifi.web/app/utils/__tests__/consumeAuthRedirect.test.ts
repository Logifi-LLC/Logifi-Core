import { beforeEach, describe, expect, it, vi } from 'vitest'

const exchangeCodeForSession = vi.fn()
const setSession = vi.fn()

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession,
      setSession,
    },
  },
}))

describe('consumeAuthRedirect', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    setSession.mockReset()
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null })
    setSession.mockResolvedValue({ data: {}, error: null })
  })

  it('exchanges a PKCE code from a custom-scheme callback', async () => {
    const { consumeAuthRedirect } = await import('../consumeAuthRedirect')
    const result = await consumeAuthRedirect('io.logifi.app://auth/callback?code=pkce-code')
    expect(result).toEqual({ consumed: true })
    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
    expect(setSession).not.toHaveBeenCalled()
  })

  it('sets a session from implicit-flow hash tokens', async () => {
    const { consumeAuthRedirect } = await import('../consumeAuthRedirect')
    const result = await consumeAuthRedirect(
      'io.logifi.app://reset-password#access_token=at&refresh_token=rt&type=recovery'
    )
    expect(result).toEqual({ consumed: true })
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('returns consumed false when the URL has no auth params', async () => {
    const { consumeAuthRedirect } = await import('../consumeAuthRedirect')
    const result = await consumeAuthRedirect('io.logifi.app://dashboard?fcv=connected')
    expect(result).toEqual({ consumed: false })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })
})
