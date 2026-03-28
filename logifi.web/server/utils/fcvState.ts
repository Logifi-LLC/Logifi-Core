import crypto from 'node:crypto'

const ALG = 'sha256'

/**
 * Create a state parameter binding the OAuth callback to the given user_id.
 * Uses HMAC with FCV client secret so only our server can verify it.
 */
export function createFcvState(userId: string, secret: string): string {
  const payload = Buffer.from(userId, 'utf8').toString('base64url')
  const sig = crypto.createHmac(ALG, secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Verify state and return the user_id, or null if invalid.
 */
export function verifyFcvState(state: string, secret: string): string | null {
  if (!state || !secret) return null
  const [payload, sig] = state.split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac(ALG, secret).update(payload).digest('base64url')
  if (sig !== expected) return null
  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}
