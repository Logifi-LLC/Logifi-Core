import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SecretBoxError } from '../secretBox'

const { tokenKey, getFlicaCredentialsKey } = vi.hoisted(() => {
  const tokenKey = Buffer.alloc(32, 9)
  return {
    tokenKey,
    getFlicaCredentialsKey: vi.fn(() => tokenKey),
  }
})

vi.mock('../secretBox', async () => {
  const actual = await vi.importActual<typeof import('../secretBox')>('../secretBox')
  return {
    ...actual,
    getFlicaCredentialsKey,
  }
})

vi.mock('../supabase', () => ({
  getUserIdFromEvent: vi.fn(),
}))

vi.mock('../supabaseService', () => ({
  getSupabaseServiceClient: vi.fn(),
}))

vi.mock('../fcvEnv', () => ({
  getFcvIntegrationEnv: vi.fn(() => ({
    tokenUrl: 'https://fcv.example/oauth/token',
    clientId: 'fictional-client-id',
    clientSecret: 'fictional-client-secret',
    redirectUri: '',
    authorizeUrl: '',
    apiBaseUrl: '',
  })),
}))

vi.mock('../fcvRetryFetch', () => ({
  fetchFcvWithRetry: vi.fn(),
}))

import { getUserIdFromEvent } from '../supabase'
import { getSupabaseServiceClient } from '../supabaseService'
import { fetchFcvWithRetry } from '../fcvRetryFetch'
import {
  getValidFcvAccessToken,
  isSealedFcvToken,
  openFcvToken,
  sealFcvToken,
} from '../fcvToken'

const USER_ID = 'user-fictional-1'

function mockIntegration(row: {
  access_token: string
  refresh_token: string
  expires_at: string
}) {
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn(() => ({ eq: updateEq }))
  const single = vi.fn().mockResolvedValue({ data: row, error: null })
  const selectEq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq: selectEq }))
  const from = vi.fn(() => ({ select, update }))
  vi.mocked(getSupabaseServiceClient).mockReturnValue({ from } as never)
  return { update, updateEq }
}

function mockRefresh(body: { access_token: string; refresh_token?: string; expires_in: number }) {
  vi.mocked(fetchFcvWithRetry).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => '',
  } as Response)
}

describe('fcv token envelope', () => {
  beforeEach(() => {
    getFlicaCredentialsKey.mockReset()
    getFlicaCredentialsKey.mockImplementation(() => tokenKey)
    vi.mocked(getUserIdFromEvent).mockReset()
    vi.mocked(getSupabaseServiceClient).mockReset()
    vi.mocked(fetchFcvWithRetry).mockReset()
  })

  it('round-trips a fictional token and does not leave it in the envelope', () => {
    const stored = sealFcvToken('fictional-access-token', tokenKey)
    expect(isSealedFcvToken(stored)).toBe(true)
    expect(stored.startsWith('logifi.fcv.sbx1.')).toBe(true)
    expect(stored).not.toContain('fictional-access-token')
    expect(openFcvToken(stored, tokenKey)).toBe('fictional-access-token')
    expect(getFlicaCredentialsKey).not.toHaveBeenCalled()
  })

  it('passes legacy plaintext through without the encryption key', () => {
    expect(isSealedFcvToken('fictional-refresh-token')).toBe(false)
    expect(openFcvToken('fictional.refresh.token')).toBe('fictional.refresh.token')
    expect(openFcvToken('fictional-access-token', tokenKey)).toBe('fictional-access-token')
    expect(getFlicaCredentialsKey).not.toHaveBeenCalled()
  })

  it('rejects a tampered envelope', () => {
    const stored = sealFcvToken('fictional-access-token', tokenKey)
    const dot = stored.lastIndexOf('.')
    const buf = Buffer.from(stored.slice(dot + 1), 'base64')
    buf[0] ^= 0xff
    const tampered = `${stored.slice(0, dot + 1)}${buf.toString('base64')}`
    expect(() => openFcvToken(tampered, tokenKey)).toThrow()
  })

  it('does not read tokens when the request is unauthenticated', async () => {
    vi.mocked(getUserIdFromEvent).mockResolvedValue(null)
    await expect(getValidFcvAccessToken({} as never)).resolves.toBeNull()
    expect(getSupabaseServiceClient).not.toHaveBeenCalled()
  })

  it('returns legacy plaintext while the access token is still valid and does not write', async () => {
    vi.mocked(getUserIdFromEvent).mockResolvedValue(USER_ID)
    const { update } = mockIntegration({
      access_token: 'fictional-access-current',
      refresh_token: 'fictional-refresh-current',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })

    await expect(getValidFcvAccessToken({} as never)).resolves.toBe('fictional-access-current')
    expect(update).not.toHaveBeenCalled()
    expect(fetchFcvWithRetry).not.toHaveBeenCalled()
    expect(getFlicaCredentialsKey).not.toHaveBeenCalled()
  })

  it('decrypts a sealed token that is still valid', async () => {
    vi.mocked(getUserIdFromEvent).mockResolvedValue(USER_ID)
    const { update } = mockIntegration({
      access_token: sealFcvToken('fictional-access-current', tokenKey),
      refresh_token: sealFcvToken('fictional-refresh-current', tokenKey),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })

    await expect(getValidFcvAccessToken({} as never)).resolves.toBe('fictional-access-current')
    expect(update).not.toHaveBeenCalled()
    expect(fetchFcvWithRetry).not.toHaveBeenCalled()
  })

  it('re-encrypts legacy plaintext on refresh', async () => {
    vi.mocked(getUserIdFromEvent).mockResolvedValue(USER_ID)
    const { update, updateEq } = mockIntegration({
      access_token: 'fictional-access-old',
      refresh_token: 'fictional-refresh-old',
      expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    })
    mockRefresh({
      access_token: 'fictional-access-refreshed',
      refresh_token: 'fictional-refresh-rotated',
      expires_in: 3600,
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getValidFcvAccessToken({} as never)).resolves.toBe('fictional-access-refreshed')

    const params = new URLSearchParams(String(vi.mocked(fetchFcvWithRetry).mock.calls[0][1]?.body ?? ''))
    expect(params.get('grant_type')).toBe('refresh_token')
    expect(params.get('refresh_token')).toBe('fictional-refresh-old')

    const patch = update.mock.calls[0][0] as { access_token: string; refresh_token: string }
    expect(isSealedFcvToken(patch.access_token)).toBe(true)
    expect(isSealedFcvToken(patch.refresh_token)).toBe(true)
    expect(patch.access_token).not.toContain('fictional-access-refreshed')
    expect(patch.refresh_token).not.toContain('fictional-refresh-rotated')
    expect(openFcvToken(patch.access_token, tokenKey)).toBe('fictional-access-refreshed')
    expect(openFcvToken(patch.refresh_token, tokenKey)).toBe('fictional-refresh-rotated')
    expect(updateEq).toHaveBeenCalledWith('user_id', USER_ID)

    const logged = errSpy.mock.calls.flat().map(String).join(' ')
    expect(logged).not.toContain('fictional-access')
    expect(logged).not.toContain('fictional-refresh')
    expect(logged).not.toContain('fictional-client-secret')
    errSpy.mockRestore()
  })

  it('decrypts a sealed refresh token before calling the provider and seals the new pair', async () => {
    vi.mocked(getUserIdFromEvent).mockResolvedValue(USER_ID)
    const { update } = mockIntegration({
      access_token: sealFcvToken('fictional-access-old', tokenKey),
      refresh_token: sealFcvToken('fictional-refresh-old', tokenKey),
      expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    })
    mockRefresh({
      access_token: 'fictional-access-refreshed',
      expires_in: 3600,
    })

    await expect(getValidFcvAccessToken({} as never)).resolves.toBe('fictional-access-refreshed')

    const params = new URLSearchParams(String(vi.mocked(fetchFcvWithRetry).mock.calls[0][1]?.body ?? ''))
    expect(params.get('refresh_token')).toBe('fictional-refresh-old')
    const patch = update.mock.calls[0][0] as { access_token: string; refresh_token: string }
    expect(openFcvToken(patch.access_token, tokenKey)).toBe('fictional-access-refreshed')
    expect(openFcvToken(patch.refresh_token, tokenKey)).toBe('fictional-refresh-old')
  })

  it('does not call the provider when the encryption key is missing', async () => {
    getFlicaCredentialsKey.mockImplementation(() => {
      throw new SecretBoxError('FLICA_CREDENTIALS_KEY is not configured')
    })
    vi.mocked(getUserIdFromEvent).mockResolvedValue(USER_ID)
    const { update } = mockIntegration({
      access_token: 'fictional-access-old',
      refresh_token: 'fictional-refresh-old',
      expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getValidFcvAccessToken({} as never)).resolves.toBeNull()
    expect(fetchFcvWithRetry).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    const logged = errSpy.mock.calls.flat().map(String).join(' ')
    expect(logged).not.toContain('fictional-access')
    expect(logged).not.toContain('fictional-refresh')
    errSpy.mockRestore()
  })
})
