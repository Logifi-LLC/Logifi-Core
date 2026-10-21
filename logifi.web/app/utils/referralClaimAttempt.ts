export type ClaimAttempt = 'idle' | 'awaiting-verify' | 'done'

const CLAIM_ATTEMPT_STORAGE_PREFIX = 'logifi_ref_claim:'

export function persistedClaimAttemptKey(userId: string): string {
  return `${CLAIM_ATTEMPT_STORAGE_PREFIX}${userId}`
}

export function readPersistedClaimAttempt(userId: string): ClaimAttempt {
  if (typeof window === 'undefined' || !userId) return 'idle'
  try {
    const raw = window.localStorage.getItem(persistedClaimAttemptKey(userId))
    if (raw === 'awaiting-verify' || raw === 'done') return raw
  } catch {
    // Private mode can throw on localStorage.
  }
  return 'idle'
}

export function writePersistedClaimAttempt(userId: string, attempt: ClaimAttempt): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    const key = persistedClaimAttemptKey(userId)
    if (attempt === 'idle') {
      window.localStorage.removeItem(key)
      return
    }
    window.localStorage.setItem(key, attempt)
  } catch {
    // Ignore.
  }
}

export function isAuthEmailVerified(user: {
  email_confirmed_at?: string | null
  confirmed_at?: string | null
} | null): boolean {
  if (!user) return false
  return Boolean(user.email_confirmed_at || user.confirmed_at)
}

/** Claim again after email confirmation. A finished attempt does not repeat. */
export function shouldClaimReferral(attempt: ClaimAttempt, emailVerified: boolean): boolean {
  if (attempt === 'done') return false
  if (attempt === 'awaiting-verify' && !emailVerified) return false
  return true
}

/**
 * Keep waiting when the account is attributed but the email is not verified yet.
 * The next authenticated load (including another tab) claims again and grants the 5 credits.
 */
/**
 * A referrer who is already signed in and opens their own link gets `self`.
 * Clearing storage there deletes the code before a new signup in the same browser can use it.
 */
export function shouldClearStoredReferral(result: {
  attributed: boolean
  reason?: string
}): boolean {
  if (result.reason === 'self') return false
  return result.attributed || Boolean(result.reason)
}

export function messageFromClaimError(error: unknown): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: { statusMessage?: unknown; message?: unknown } }).data
    const statusMessage = data?.statusMessage ?? (error as { statusMessage?: unknown }).statusMessage
    if (typeof statusMessage === 'string' && statusMessage.trim()) return statusMessage.trim()
    const message = data?.message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return 'Could not apply referral code'
}

export function nextClaimAttempt(input: {
  emailVerified: boolean
  attributed: boolean
  friendCreditsGranted: boolean
}): ClaimAttempt {
  if (!input.emailVerified && input.attributed && !input.friendCreditsGranted) {
    return 'awaiting-verify'
  }
  return 'done'
}
