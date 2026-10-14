export type ClaimAttempt = 'idle' | 'awaiting-verify' | 'done'

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
