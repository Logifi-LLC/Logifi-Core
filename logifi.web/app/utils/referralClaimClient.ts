import type { AttributionBlock } from '../../shared/referrals'
import { apiFetch } from '~/utils/apiFetch'
import {
  messageFromClaimError,
  nextClaimAttempt,
  readPersistedClaimAttempt,
  shouldClaimReferral,
  shouldClearStoredReferral,
  writePersistedClaimAttempt,
  type ClaimAttempt,
} from '~/utils/referralClaimAttempt'
import { clearStoredReferralCode, readStoredReferralCode } from '~/utils/referralCapture'
import { useToast } from '~/composables/useToast'

interface ReferralClaimResult {
  ok: boolean
  attributed: boolean
  friendCreditsGranted?: boolean
  reason?: AttributionBlock
}

interface ReferralStatus {
  referred: boolean
  canEnterCode: boolean
}

const CLAIM_MESSAGES: Record<AttributionBlock, string> = {
  invalid_code: 'Enter a valid code',
  unknown_code: 'Code not found',
  self: "That's your code",
  already_referred: 'Referral already applied',
}

const attempts = new Map<string, ClaimAttempt>()
const inflight = new Set<string>()

export function claimResultMessage(
  result: ReferralClaimResult,
  options: {
    emailVerified?: boolean
    interactive?: boolean
    hadStoredCode?: boolean
  } = {}
): string | null {
  const emailVerified = options.emailVerified ?? true
  const interactive = options.interactive ?? false
  const hadStoredCode = options.hadStoredCode ?? false

  if (!result.ok && result.reason) {
    if (!interactive) return null
    return CLAIM_MESSAGES[result.reason]
  }
  if (result.friendCreditsGranted) return '5 credits added'
  if (result.attributed && !emailVerified) {
    return 'Referral saved. 5 credits arrive when the email is verified.'
  }
  if (result.attributed && (interactive || hadStoredCode)) return 'Referral applied'
  return null
}

/**
 * Apply the stored code for this signed-in account.
 * Email confirmation often finishes in another tab, so this runs on every new session.
 */
function rememberClaimAttempt(userId: string, attempt: ClaimAttempt) {
  attempts.set(userId, attempt)
  writePersistedClaimAttempt(userId, attempt)
}

function loadClaimAttempt(userId: string): ClaimAttempt {
  const cached = attempts.get(userId)
  if (cached) return cached
  const persisted = readPersistedClaimAttempt(userId)
  if (persisted !== 'idle') attempts.set(userId, persisted)
  return persisted
}

export async function claimStoredReferral(input: {
  userId: string
  token: string
  emailVerified: boolean
  code?: string | null
  interactive?: boolean
}): Promise<string | null> {
  if (!input.userId || !input.token || inflight.has(input.userId)) return null
  const interactive = Boolean(input.interactive)
  const previous = loadClaimAttempt(input.userId)
  if (!shouldClaimReferral(previous, input.emailVerified)) return null

  inflight.add(input.userId)
  const code = input.code ?? readStoredReferralCode()
  const hadStoredCode = Boolean(code)
  let message: string | null = null
  try {
    if (
      !code &&
      previous === 'idle' &&
      input.emailVerified &&
      !interactive
    ) {
      const status = await apiFetch<ReferralStatus>('/api/referrals', {
        headers: { Authorization: `Bearer ${input.token}` },
      })
      if (status.referred) {
        rememberClaimAttempt(input.userId, 'done')
        return null
      }
    }

    const result = await apiFetch<ReferralClaimResult>('/api/referrals/claim', {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.token}` },
      body: code ? { code } : {},
    })
    if (shouldClearStoredReferral(result)) clearStoredReferralCode()
    rememberClaimAttempt(
      input.userId,
      nextClaimAttempt({
        emailVerified: input.emailVerified,
        attributed: result.attributed,
        friendCreditsGranted: Boolean(result.friendCreditsGranted),
      })
    )
    message = claimResultMessage(result, {
      emailVerified: input.emailVerified,
      interactive,
      hadStoredCode: hadStoredCode || Boolean(input.code),
    })
  } catch (error) {
    rememberClaimAttempt(input.userId, previous)
    if (interactive) message = messageFromClaimError(error)
  } finally {
    inflight.delete(input.userId)
  }

  if (message) {
    const saved =
      message === '5 credits added' ||
      message === 'Referral applied' ||
      message.startsWith('Referral saved')
    useToast().showToast(message, { type: saved ? 'success' : 'error' })
  }

  return message
}
