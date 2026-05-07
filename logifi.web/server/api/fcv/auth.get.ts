import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent } from '../../utils/supabase'
import { createFcvState } from '../../utils/fcvState'
import { getFcvIntegrationEnv } from '../../utils/fcvEnv'

/**
 * Start FC View OAuth: validate user, return redirect URL to FC View authorize endpoint.
 * Client must call with Authorization: Bearer <supabase_access_token>, then redirect the user to the returned redirectUrl.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const fcv = getFcvIntegrationEnv()
  const clientId = fcv.clientId
  const redirectUri = fcv.redirectUri
  const authorizeUrl = fcv.authorizeUrl
  const tokenUrl = fcv.tokenUrl
  const secret = fcv.clientSecret

  const missingKeys = [
    !clientId && 'FCV_CLIENT_ID',
    !secret && 'FCV_CLIENT_SECRET',
    !redirectUri && 'FCV_REDIRECT_URI',
    !authorizeUrl && 'FCV_AUTHORIZE_URL',
    !tokenUrl && 'FCV_TOKEN_URL',
  ].filter((x): x is string => Boolean(x))

  if (missingKeys.length > 0) {
    throw createError({
      statusCode: 503,
      statusMessage: 'FC View integration is not configured',
      data: {
        code: 'FCV_NOT_CONFIGURED',
        missingKeys,
        hint: 'Set these in Vercel Environment Variables (or .env locally), then redeploy.',
      },
    })
  }

  const state = createFcvState(userId, secret)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  })

  const redirectUrl = `${authorizeUrl}?${params.toString()}`
  return { redirectUrl }
})
