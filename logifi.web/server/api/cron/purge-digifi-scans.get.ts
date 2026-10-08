import { createError, defineEventHandler, getRequestHeader } from 'h3'
import { authorizationMatchesCronSecret, readCronSecret } from '../../utils/cronAuth'
import {
  createSupabaseDigifiScanSessionSource,
  purgeExpiredDigifiScans,
} from '../../utils/digifiScanPurge'
import { getSupabaseServiceClient } from '../../utils/supabaseService'

/**
 * Hourly Vercel Cron. Deletes digifi-scans objects past digifi_scan_sessions.expires_at,
 * then the session rows. Requires Authorization: Bearer $CRON_SECRET.
 */
export default defineEventHandler(async (event) => {
  const secret = readCronSecret()
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'Cron purge is not configured' })
  }

  if (!authorizationMatchesCronSecret(getRequestHeader(event, 'authorization'), secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Digifi scan purge is not configured on this server',
    })
  }

  const result = await purgeExpiredDigifiScans(createSupabaseDigifiScanSessionSource(service))
  console.info('[digifi-scan-purge]', result)

  if (!result.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Digifi scan purge did not finish',
      data: result,
    })
  }

  return result
})
