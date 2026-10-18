import { createError, defineEventHandler, readBody } from 'h3'
import { referralCodeFromBody } from '../../../shared/referrals'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { referralSchemaMissing } from '../../utils/referralStore'
import {
  authEmailVerified,
  claimReferralForUser,
  readAuthUser,
  referralClaimFailureMessage,
  sanitizeReferralClaimResult,
} from '../../utils/referrals'
import { referralClaimRateLimitExceeded } from '../../utils/referralClaimRateLimit'

export default defineEventHandler(async (event) => {
  const user = await readAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Referral service is not configured' })
  }

  if (referralClaimRateLimitExceeded(user.id)) {
    return sanitizeReferralClaimResult({
      ok: false,
      attributed: false,
      friendCreditsGranted: false,
      reason: 'invalid_code',
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const rawCode = referralCodeFromBody(body)

  try {
    const result = await claimReferralForUser(service, user.id, rawCode, authEmailVerified(user))
    return sanitizeReferralClaimResult(result)
  } catch (error) {
    if (referralSchemaMissing(error)) {
      throw createError({ statusCode: 503, statusMessage: 'Referral program is not available yet' })
    }
    console.error('[referrals] claim failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: referralClaimFailureMessage(error),
    })
  }
})
