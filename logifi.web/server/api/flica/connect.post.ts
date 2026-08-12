import { defineEventHandler, readBody, createError } from 'h3'
import { getUserIdFromEvent, getSupabaseClient } from '../../utils/supabase'
import { loginFlica, FlicaClientError } from '../../utils/flicaClient'
import { normalizeFlicaUserId, resolveFlicaPortal } from '../../utils/flicaPortal'
import { sealSecret, SecretBoxError } from '../../utils/secretBox'

interface ConnectBody {
  username?: string
  password?: string
  airlineCode?: string
}

/**
 * Validate FLICA credentials, seal password, upsert flica_integrations.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  let body: ConnectBody
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  const password = typeof body?.password === 'string' ? body.password : ''
  if (!password) {
    throw createError({ statusCode: 400, statusMessage: 'Password is required' })
  }

  let portal
  try {
    portal = resolveFlicaPortal(body?.airlineCode)
  } catch (e) {
    throw createError({
      statusCode: 400,
      statusMessage: e instanceof Error ? e.message : 'Unsupported airline',
    })
  }

  const username = normalizeFlicaUserId(String(body?.username ?? ''), portal)
  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: 'FLICA User ID is required (e.g. RPA624619 or employee number)',
    })
  }

  try {
    await loginFlica({ host: portal.host, username, password })
  } catch (e) {
    if (e instanceof FlicaClientError) {
      const status = e.code === 'network' ? 502 : 401
      throw createError({ statusCode: status, statusMessage: e.message })
    }
    throw createError({ statusCode: 502, statusMessage: 'FLICA login failed' })
  }

  let sealed
  try {
    sealed = sealSecret(password)
  } catch (e) {
    if (e instanceof SecretBoxError) {
      throw createError({
        statusCode: 503,
        statusMessage: 'FLICA credential encryption is not configured (FLICA_CREDENTIALS_KEY)',
      })
    }
    throw e
  }

  const supabase = getSupabaseClient(event)
  const row = {
    user_id: userId,
    airline_code: portal.airlineCode,
    portal_host: portal.host,
    username,
    password_ciphertext: sealed.ciphertext,
    password_nonce: sealed.nonce,
    key_version: sealed.keyVersion,
    last_ok_at: new Date().toISOString(),
    last_error: null as string | null,
  }

  const { data: existing } = await supabase
    .from('flica_integrations')
    .select('id')
    .eq('user_id', userId)
    .eq('airline_code', portal.airlineCode)
    .maybeSingle()

  let error
  if (existing?.id) {
    ;({ error } = await supabase.from('flica_integrations').update(row).eq('id', existing.id))
  } else {
    ;({ error } = await supabase.from('flica_integrations').insert(row))
  }

  if (error) {
    console.error('flica_integrations upsert failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save FLICA connection' })
  }

  return {
    success: true,
    connected: true,
    airlineCode: portal.airlineCode,
    username,
  }
})
