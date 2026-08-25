import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const KEY_BYTES = 32
const IV_BYTES = 12

export class SecretBoxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecretBoxError'
  }
}

function resolveKeyMaterial(raw: string): Buffer {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new SecretBoxError('FLICA_CREDENTIALS_KEY is not configured')
  }

  // Prefer base64 (44 chars for 32 bytes) then hex (64 chars).
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length >= 40) {
    try {
      const b64 = Buffer.from(trimmed, 'base64')
      if (b64.length === KEY_BYTES) return b64
    } catch {
      /* fall through */
    }
  }
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === KEY_BYTES * 2) {
    return Buffer.from(trimmed, 'hex')
  }

  // Last resort: UTF-8 padded/truncated to 32 bytes (dev convenience only).
  const utf = Buffer.from(trimmed, 'utf8')
  if (utf.length === KEY_BYTES) return utf
  const out = Buffer.alloc(KEY_BYTES)
  utf.copy(out, 0, 0, Math.min(utf.length, KEY_BYTES))
  return out
}

export function getFlicaCredentialsKey(): Buffer {
  const config = useRuntimeConfig()
  const raw =
    (typeof process.env.FLICA_CREDENTIALS_KEY === 'string' && process.env.FLICA_CREDENTIALS_KEY) ||
    (typeof process.env.NUXT_FLICA_CREDENTIALS_KEY === 'string' &&
      process.env.NUXT_FLICA_CREDENTIALS_KEY) ||
    (typeof config.flicaCredentialsKey === 'string' && config.flicaCredentialsKey) ||
    ''
  return resolveKeyMaterial(raw)
}

export interface SealedSecret {
  ciphertext: string
  nonce: string
  keyVersion: number
}

/**
 * AES-256-GCM seal. ciphertext/nonce are base64.
 */
export function sealSecret(plaintext: string, key?: Buffer, keyVersion = 1): SealedSecret {
  const k = key ?? getFlicaCredentialsKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    nonce: iv.toString('base64'),
    keyVersion,
  }
}

export function unsealSecret(
  ciphertextB64: string,
  nonceB64: string,
  key?: Buffer
): string {
  const k = key ?? getFlicaCredentialsKey()
  const combined = Buffer.from(ciphertextB64, 'base64')
  if (combined.length <= 16) {
    throw new SecretBoxError('Invalid ciphertext')
  }
  const data = combined.subarray(0, combined.length - 16)
  const tag = combined.subarray(combined.length - 16)
  const iv = Buffer.from(nonceB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', k, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
