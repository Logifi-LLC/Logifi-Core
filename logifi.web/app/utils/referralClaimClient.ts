import type { AttributionBlock } from '../../shared/referrals'
import { apiFetch } from '~/utils/apiFetch'
import {
  messageFromClaimError,
  nextClaimAttempt,
  shouldClaimReferral,
  shouldClearStoredReferral,
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

const CLAIM_MESSAGES: Record<AttributionBlock, string> = {
  invalid_code: 'Enter a valid code',
  unknown_code: 'Code not found',
  self: "That's your code",
  already_referred: 'Referral already applied',
  paid_purchase: 'Codes can be entered before your first credit purchase',
}

const attempts = new Map<string, ClaimAttempt>()
const inflight = new Set<string>()

export function claimResultMessage(
  result: ReferralClaimResult,
  emailVerified = true
): string | null {
  if (!result.ok && result.reason) return CLAIM_MESSAGES[result.reason]
  if (result.friendCreditsGranted) return '5 credits added'
  if (result.attributed && !emailVerified) {
    return 'Referral saved. 5 credits arrive when the email is verified.'
  }
  if (result.attributed) return 'Referral applied'
  return null
}

/**
 * Apply the stored code for this signed-in account.
 * Email confirmation often finishes in another tab, so this runs on every new session.
 */
export async function claimStoredReferral(input: {
  userId: string
  token: string
  emailVerified: boolean
  code?: string | null
}): Promise<string | null> {
  if (!input.userId || !input.token || inflight.has(input.userId)) return null
  const previous = attempts.get(input.userId) ?? 'idle'
  if (!shouldClaimReferral(previous, input.emailVerified)) return null

  inflight.add(input.userId)
  const code = input.code ?? readStoredReferralCode()
  let message: string | null = null
  try {
    const result = await apiFetch<ReferralClaimResult>('/api/referrals/claim', {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.token}` },
      body: code ? { code } : {},
    })
    if (code && shouldClearStoredReferral(result)) clearStoredReferralCode()
    attempts.set(
      input.userId,
      nextClaimAttempt({
        emailVerified: input.emailVerified,
        attributed: result.attributed,
        friendCreditsGranted: Boolean(result.friendCreditsGranted),
      })
    )
    message = claimResultMessage(result, input.emailVerified)
  } catch (error) {
    attempts.set(input.userId, previous)
    message = messageFromClaimError(error)
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
