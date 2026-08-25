import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { loginFlica, probeFlicaMenu, FlicaClientError } from '../../utils/flicaClient'
import { resolveFlicaPortal } from '../../utils/flicaPortal'
import { unsealSecret, SecretBoxError } from '../../utils/secretBox'

/**
 * Debug helper: login to FLICA and return what navigation links/frames the scraper sees.
 * No passwords or cookies are returned.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  let portal
  try {
    portal = resolveFlicaPortal('RJET')
  } catch (e) {
    throw createError({
      statusCode: 400,
      statusMessage: e instanceof Error ? e.message : 'Unsupported airline',
    })
  }

  const supabase = getSupabaseClient(event)
  const { data: integration, error: loadErr } = await supabase
    .from('flica_integrations')
    .select(
      'id, username, password_ciphertext, password_nonce, portal_host, airline_code'
    )
    .eq('user_id', userId)
    .eq('airline_code', portal.airlineCode)
    .maybeSingle()

  if (loadErr) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load FLICA connection' })
  }
  if (!integration) {
    throw createError({ statusCode: 400, statusMessage: 'Connect FLICA first' })
  }

  let password: string
  try {
    password = unsealSecret(integration.password_ciphertext, integration.password_nonce)
  } catch (e) {
    if (e instanceof SecretBoxError) {
      throw createError({
        statusCode: 503,
        statusMessage: 'FLICA credential encryption is not configured (FLICA_CREDENTIALS_KEY)',
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not decrypt stored FLICA password. Disconnect and reconnect.',
    })
  }

  try {
    const session = await loginFlica({
      host: integration.portal_host || portal.host,
      username: integration.username,
      password,
    })
    const probe = await probeFlicaMenu(session)
    return { success: true, probe }
  } catch (e) {
    const message =
      e instanceof FlicaClientError ? e.message : 'Failed to probe FLICA menu'
    throw createError({
      statusCode: e instanceof FlicaClientError && e.code === 'login_failed' ? 401 : 502,
      statusMessage: message,
    })
  }
})
