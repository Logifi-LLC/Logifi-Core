import { describe, expect, it } from 'vitest'
import { sealSecret, unsealSecret } from '../secretBox'
import { randomBytes } from 'node:crypto'

describe('secretBox', () => {
  const key = randomBytes(32)

  it('round-trips plaintext', () => {
    const sealed = sealSecret('super-secret-password', key, 1)
    expect(sealed.ciphertext).toBeTruthy()
    expect(sealed.nonce).toBeTruthy()
    expect(sealed.keyVersion).toBe(1)
    expect(unsealSecret(sealed.ciphertext, sealed.nonce, key)).toBe('super-secret-password')
  })

  it('fails on tampered ciphertext', () => {
    const sealed = sealSecret('hello', key)
    const buf = Buffer.from(sealed.ciphertext, 'base64')
    buf[0] ^= 0xff
    expect(() => unsealSecret(buf.toString('base64'), sealed.nonce, key)).toThrow()
  })
})
