import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { openStoredFcvToken, sealFcvTokenPair } from '../fcvToken'

const ACCESS = 'fcv-test-access-token-0001'
const REFRESH = 'fcv-test-refresh-token-0001'

describe('fcv token seal', () => {
  const key = randomBytes(32)

  it('round-trips fictional access and refresh tokens', () => {
    const sealed = sealFcvTokenPair(ACCESS, REFRESH, key)

    expect(sealed.access_token).not.toBe(ACCESS)
    expect(sealed.refresh_token).not.toBe(REFRESH)
    expect(sealed.access_token.includes(ACCESS)).toBe(false)
    expect(sealed.refresh_token.includes(REFRESH)).toBe(false)
    expect(sealed.access_token_nonce).toBeTruthy()
    expect(sealed.refresh_token_nonce).toBeTruthy()
    expect(sealed.access_token_nonce).not.toBe(sealed.refresh_token_nonce)
    expect(sealed.key_version).toBe(1)

    expect(openStoredFcvToken(sealed.access_token, sealed.access_token_nonce, key)).toEqual({
      token: ACCESS,
      legacy: false,
    })
    expect(openStoredFcvToken(sealed.refresh_token, sealed.refresh_token_nonce, key)).toEqual({
      token: REFRESH,
      legacy: false,
    })
  })

  it('reads legacy plaintext when the nonce is missing', () => {
    expect(openStoredFcvToken(ACCESS, null, key)).toEqual({ token: ACCESS, legacy: true })
    expect(openStoredFcvToken(REFRESH, undefined, key)).toEqual({ token: REFRESH, legacy: true })
    expect(openStoredFcvToken(ACCESS, '', key)).toEqual({ token: ACCESS, legacy: true })
    expect(openStoredFcvToken(ACCESS, '   ', key)).toEqual({ token: ACCESS, legacy: true })
  })

  it('does not treat a sealed value as a token when the nonce is missing', () => {
    const sealed = sealFcvTokenPair(ACCESS, REFRESH, key)
    const opened = openStoredFcvToken(sealed.access_token, null, key)
    expect(opened.legacy).toBe(true)
    expect(opened.token).toBe(sealed.access_token)
    expect(opened.token).not.toBe(ACCESS)
  })

  it('rejects a tampered ciphertext instead of returning it', () => {
    const sealed = sealFcvTokenPair(ACCESS, REFRESH, key)
    const buf = Buffer.from(sealed.access_token, 'base64')
    buf[0] ^= 0xff
    expect(() =>
      openStoredFcvToken(buf.toString('base64'), sealed.access_token_nonce, key)
    ).toThrow()
  })
})
