import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent } from '../../utils/supabase'
import { createFcvState } from '../../utils/fcvState'

/**
 * Start FC View OAuth: validate user, return redirect URL to FC View authorize endpoint.
 * Client must call with Authorization: Bearer <supabase_access_token>, then redirect the user to the returned redirectUrl.
 */
export default defineEventHandler(async (event) => {
  const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig()
  const clientId = clean(config.fcvClientId)
  const redirectUri = clean(config.fcvRedirectUri)
  const authorizeUrl = clean(config.fcvAuthorizeUrl)
  const secret = clean(config.fcvClientSecret)

  if (!clientId || !redirectUri || !authorizeUrl || !secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'FC View integration is not configured',
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
