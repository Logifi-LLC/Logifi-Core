import type { EmailOtpType } from '@supabase/supabase-js'

export const ALLOWED_AUTH_CONFIRM_TYPES = [
  'recovery',
  'signup',
  'email',
  'email_change',
] as const

export type AllowedAuthConfirmType = (typeof ALLOWED_AUTH_CONFIRM_TYPES)[number]

export const AUTH_CONFIRM_RECOVERY_NEXT = '/reset-password'
export const AUTH_CONFIRM_DEFAULT_NEXT = '/dashboard'

const DUMMY_ORIGIN = 'https://logifi.invalid'
const MAX_NEXT_LENGTH = 200

export type ConfirmAuthOtpFailureReason = 'missing_token' | 'bad_type' | 'verify_failed'

export type ConfirmAuthOtpResult =
  | { ok: true; type: AllowedAuthConfirmType; nextPath: string }
  | { ok: false; reason: ConfirmAuthOtpFailureReason; message: string }

export function isAllowedAuthConfirmType(value: unknown): value is AllowedAuthConfirmType {
  const type = firstString(value)
  return !!type && (ALLOWED_AUTH_CONFIRM_TYPES as readonly string[]).includes(type)
}

/**
 * Same-origin relative path only. Rejects protocol-relative URLs, other
 * origins, credentials, and control characters.
 */
export function safeAuthNextPath(raw: unknown, fallback: string): string {
  const value = firstString(raw)?.trim()
  if (!value || value.length > MAX_NEXT_LENGTH) return fallback

  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return fallback
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback
  if (decoded.includes('\\') || decoded.includes('\0') || /[\r\n\t]/.test(decoded)) {
    return fallback
  }
  if (decoded.includes('://')) return fallback

  try {
    const url = new URL(decoded, DUMMY_ORIGIN)
    if (url.origin !== DUMMY_ORIGIN) return fallback
    if (url.username || url.password) return fallback
    const pathAndSearch = `${url.pathname}${url.search}`
    if (!pathAndSearch.startsWith('/') || pathAndSearch.startsWith('//')) return fallback
    return pathAndSearch
  } catch {
    return fallback
  }
}

export function defaultAuthConfirmNext(type: AllowedAuthConfirmType): string {
  return type === 'recovery' ? AUTH_CONFIRM_RECOVERY_NEXT : AUTH_CONFIRM_DEFAULT_NEXT
}

export async function confirmAuthOtp(input: {
  tokenHash: unknown
  type: unknown
  next: unknown
  verifyOtp: (args: {
    token_hash: string
    type: EmailOtpType
  }) => Promise<{ error: { message?: string } | null }>
}): Promise<ConfirmAuthOtpResult> {
  if (!isAllowedAuthConfirmType(input.type)) {
    return {
      ok: false,
      reason: 'bad_type',
      message: 'This link is not a password reset. Request a new reset link.',
    }
  }

  const tokenHash = firstString(input.tokenHash)?.trim() ?? ''
  if (!tokenHash) {
    return {
      ok: false,
      reason: 'missing_token',
      message: 'This reset link is missing information. Request a new one.',
    }
  }

  const nextPath = safeAuthNextPath(input.next, defaultAuthConfirmNext(input.type))

  let error: { message?: string } | null
  try {
    ;({ error } = await input.verifyOtp({
      token_hash: tokenHash,
      type: input.type,
    }))
  } catch {
    return {
      ok: false,
      reason: 'verify_failed',
      message: 'Could not verify this link. Request a new reset link.',
    }
  }

  if (error) {
    const expired = /expired|invalid|already been used/i.test(error.message ?? '')
    return {
      ok: false,
      reason: 'verify_failed',
      message: expired
        ? 'This reset link expired or was already used. Request a new one.'
        : 'Could not verify this link. Request a new reset link.',
    }
  }

  return { ok: true, type: input.type, nextPath }
}

function firstString(raw: unknown): string | null {
  if (Array.isArray(raw)) return typeof raw[0] === 'string' ? raw[0] : null
  return typeof raw === 'string' ? raw : null
}
