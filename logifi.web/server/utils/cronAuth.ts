/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that env var is set.
 * The route refuses to run when the secret is missing.
 */

export function readCronSecret(): string {
  const fromEnv = (process.env.CRON_SECRET || '').trim()
  if (fromEnv) return fromEnv
  try {
    const config = useRuntimeConfig() as { cronSecret?: unknown }
    return typeof config.cronSecret === 'string' ? config.cronSecret.trim() : ''
  } catch {
    return ''
  }
}

export function authorizationMatchesCronSecret(
  authorization: string | null | undefined,
  secret: string | null | undefined
): boolean {
  const trimmed = (secret ?? '').trim()
  if (!trimmed || !authorization) return false
  const expected = `Bearer ${trimmed}`
  const provided = authorization.trim()
  if (provided.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
  }
  return mismatch === 0
}
