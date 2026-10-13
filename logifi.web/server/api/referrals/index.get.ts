import { createError, defineEventHandler } from 'h3'
import { getSupabaseServiceClient } from '../../utils/supabaseService'
import { referralSchemaMissing } from '../../utils/referralStore'
import { getReferralStatusForUser, readAuthUser } from '../../utils/referrals'

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
    return await getReferralStatusForUser(service, user.id)
  } catch (error) {
    if (referralSchemaMissing(error)) {
      throw createError({ statusCode: 503, statusMessage: 'Referral program is not available yet' })
    }
    console.error('[referrals] status failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not load invite' })
  }
})
