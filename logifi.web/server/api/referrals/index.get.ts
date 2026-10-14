import { createError, defineEventHandler, getRequestHeader } from 'h3'
import { isCapacitorApiOrigin } from '../../utils/corsAllow'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { referralSchemaMissing } from '../../utils/referralStore'
import { getReferralStatusForUser, readAuthUser } from '../../utils/referrals'

/** Browser origin for the share link. Native WebView hosts are not public. */
function shareOriginFromRequest(event: Parameters<typeof getRequestHeader>[0]): string | undefined {
  const header = getRequestHeader(event, 'origin') || getRequestHeader(event, 'referer')
  if (!header) return undefined
  try {
    const origin = new URL(header).origin
    if (isCapacitorApiOrigin(origin)) return undefined
    return origin
  } catch {
    return undefined
  }
}

export default defineEventHandler(async (event) => {
  const user = await readAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({ statusCode: 503, statusMessage: 'Referral service is not configured' })
  }

  try {
    return await getReferralStatusForUser(service, user.id, shareOriginFromRequest(event))
  } catch (error) {
    if (referralSchemaMissing(error)) {
      throw createError({ statusCode: 503, statusMessage: 'Referral program is not available yet' })
    }
    console.error('[referrals] status failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not load invite' })
  }
})
