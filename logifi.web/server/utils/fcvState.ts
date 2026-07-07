import crypto from 'node:crypto'

const ALG = 'sha256'

export interface FcvStateData {
  userId: string
  /** OAuth started from the native (Capacitor) app; callback must return via the app deep link. */
  native: boolean
}

/**
 * Create a state parameter binding the OAuth callback to the given user_id (and platform).
 * Uses HMAC with FCV client secret so only our server can verify it.
 */
export function createFcvState(
  userId: string,
  secret: string,
  opts?: { native?: boolean }
): string {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, n: opts?.native ? 1 : 0 }),
    'utf8'
  ).toString('base64url')
  const sig = crypto.createHmac(ALG, secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Verify state and return the decoded data, or null if invalid.
 * Falls back to treating the payload as a bare user_id for states minted before
 * the platform flag existed.
 */
export function verifyFcvState(state: string, secret: string): FcvStateData | null {
  if (!state || !secret) return null
  const [payload, sig] = state.split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac(ALG, secret).update(payload).digest('base64url')
  if (sig !== expected) return null
  let decoded: string
  try {
    decoded = Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(decoded) as { u?: unknown; n?: unknown }
    if (typeof parsed?.u === 'string' && parsed.u) {
      return { userId: parsed.u, native: parsed.n === 1 || parsed.n === true }
    }
  } catch {
    // Legacy state: payload was the raw user_id (not JSON).
    if (decoded) return { userId: decoded, native: false }
  }
  return null
}
