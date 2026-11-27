import type { H3Event } from 'h3'
import { getUserIdFromEvent } from './supabase'
import { getSupabaseServiceClient } from './supabaseService'
import { fetchFcvWithRetry } from './fcvRetryFetch'
import { getFcvIntegrationEnv } from './fcvEnv'
import {
  getFlicaCredentialsKey,
  sealSecret,
  SecretBoxError,
  unsealSecret,
} from './secretBox'

const EXPIRY_BUFFER_MS = 60 * 1000 // refresh if expires within 60 seconds

/**
 * Packed AES-256-GCM envelope in the existing TEXT columns.
 * The prefix does not occur in legacy plaintext, so those rows pass through
 * until the next refresh writes a sealed value. Nonce and ciphertext are
 * standard base64 (no "."), so one dot separates them.
 */
const FCV_TOKEN_ENVELOPE_PREFIX = 'logifi.fcv.sbx1.'

export function isSealedFcvToken(stored: string): boolean {
  return stored.startsWith(FCV_TOKEN_ENVELOPE_PREFIX)
}

export function sealFcvToken(plaintext: string, key?: Buffer): string {
  const sealed = sealSecret(plaintext, key ?? getFlicaCredentialsKey(), 1)
  return `${FCV_TOKEN_ENVELOPE_PREFIX}${sealed.nonce}.${sealed.ciphertext}`
}

function splitSealedFcvToken(stored: string): { nonce: string; ciphertext: string } {
  const body = stored.slice(FCV_TOKEN_ENVELOPE_PREFIX.length)
  const dot = body.indexOf('.')
  if (dot <= 0 || dot >= body.length - 1) {
    throw new SecretBoxError('Invalid FCV token envelope')
  }
  const nonce = body.slice(0, dot)
  const ciphertext = body.slice(dot + 1)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(nonce) || !/^[A-Za-z0-9+/]+={0,2}$/.test(ciphertext)) {
    throw new SecretBoxError('Invalid FCV token envelope')
  }
  return { nonce, ciphertext }
}

/**
 * Decrypt a sealed token. Anything that is not an envelope is returned as-is.
 */
export function openFcvToken(stored: string, key?: Buffer): string {
  if (!isSealedFcvToken(stored)) return stored
  const { nonce, ciphertext } = splitSealedFcvToken(stored)
  return unsealSecret(ciphertext, nonce, key ?? getFlicaCredentialsKey())
}

function fcvTokenKeyOrNull(): Buffer | null {
  try {
    return getFlicaCredentialsKey()
  } catch (e) {
    if (e instanceof SecretBoxError) return null
    throw e
  }
}

/**
 * Get a valid FC View access token for the current user, refreshing if expired.
 * Returns the access token or null if no integration or refresh failed.
 * Reads and writes go through the service role because token columns are not
 * selectable by the authenticated role. Legacy plaintext still decrypts as itself
 * and is sealed on the next refresh.
 */
export async function getValidFcvAccessToken(event: H3Event): Promise<string | null> {
  const userId = await getUserIdFromEvent(event)
  if (!userId) return null

  const { tokenUrl, clientId, clientSecret } = getFcvIntegrationEnv()

  if (!tokenUrl || !clientId || !clientSecret) return null

  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    console.error('FC View token read skipped: service role client unavailable')
    return null
  }

  const { data: integration, error: selectErr } = await supabase
    .from('fcv_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (selectErr || !integration) return null

  let accessToken: string
  let refreshToken: string
  try {
    accessToken = openFcvToken(integration.access_token)
    refreshToken = openFcvToken(integration.refresh_token)
  } catch (e) {
    console.error('FC View token decrypt failed:', e instanceof Error ? e.message : 'unknown')
    return null
  }

  const expiresAt = new Date(integration.expires_at).getTime()
  if (Date.now() < expiresAt - EXPIRY_BUFFER_MS) {
    return accessToken
  }

  // Refuse to rotate tokens we cannot seal. A provider that invalidates the
  // previous refresh token would lock the user out if the save failed.
  if (!fcvTokenKeyOrNull()) {
    console.error('FC View token refresh skipped: FLICA_CREDENTIALS_KEY is not configured')
    return null
  }

  const refreshRes = await fetchFcvWithRetry(tokenUrl, {
    logLabel: 'FC View token refresh',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!refreshRes.ok) {
    console.error('FC View token refresh failed:', refreshRes.status, await refreshRes.text())
    return null
  }

  const data = (await refreshRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  if (typeof data.access_token !== 'string' || !data.access_token) {
    console.error('FC View token refresh returned no access token')
    return null
  }

  let sealedAccess: string
  let sealedRefresh: string
  try {
    sealedAccess = sealFcvToken(data.access_token)
    sealedRefresh = sealFcvToken(data.refresh_token ?? refreshToken)
  } catch (e) {
    console.error('FC View token seal failed:', e instanceof Error ? e.message : 'unknown')
    return null
  }

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const { error: updateError } = await supabase
    .from('fcv_integrations')
    .update({
      access_token: sealedAccess,
      refresh_token: sealedRefresh,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('FC View token update failed:', updateError.message)
    return null
  }

  return data.access_token
}
