import type { H3Event } from 'h3'
import { getUserIdFromEvent } from './supabase'
import { getSupabaseServiceClient } from './supabaseService'
import { fetchFcvWithRetry } from './fcvRetryFetch'
import { getFcvIntegrationEnv } from './fcvEnv'
import { getFlicaCredentialsKey, sealSecret, SecretBoxError, unsealSecret } from './secretBox'

const EXPIRY_BUFFER_MS = 60 * 1000 // refresh if expires within 60 seconds

export interface SealedFcvTokenPair {
  access_token: string
  access_token_nonce: string
  refresh_token: string
  refresh_token_nonce: string
  key_version: number
}

export interface OpenedFcvToken {
  token: string
  /** True when the row has no nonce and the stored value is still plaintext. */
  legacy: boolean
}

/**
 * Seal an FC View access/refresh pair with the FLICA AES-256-GCM helper.
 * Ciphertext and nonce are stored in separate columns, same shape as FLICA passwords.
 */
export function sealFcvTokenPair(
  accessToken: string,
  refreshToken: string,
  key?: Buffer
): SealedFcvTokenPair {
  const access = sealSecret(accessToken, key)
  const refresh = sealSecret(refreshToken, key)
  return {
    access_token: access.ciphertext,
    access_token_nonce: access.nonce,
    refresh_token: refresh.ciphertext,
    refresh_token_nonce: refresh.nonce,
    key_version: access.keyVersion,
  }
}

/**
 * Open one stored token. A missing nonce means a legacy plaintext row (pre-encryption).
 * A present nonce is always decrypted; ciphertext is never treated as a token.
 */
export function openStoredFcvToken(
  value: string,
  nonce: string | null | undefined,
  key?: Buffer
): OpenedFcvToken {
  if (typeof nonce !== 'string' || nonce.trim() === '') {
    return { token: value, legacy: true }
  }
  return { token: unsealSecret(value, nonce, key), legacy: false }
}

type ServiceClient = NonNullable<ReturnType<typeof getSupabaseServiceClient>>

/**
 * Rewrite a legacy plaintext row in place. The filter refuses to clobber a row that
 * another request already sealed or refreshed.
 */
async function reencryptLegacyFcvTokens(
  supabase: ServiceClient,
  userId: string,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  try {
    const sealed = sealFcvTokenPair(accessToken, refreshToken)
    const { error } = await supabase
      .from('fcv_integrations')
      .update({
        ...sealed,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .or('access_token_nonce.is.null,refresh_token_nonce.is.null')
    if (error) {
      console.error('FC View legacy token re-encrypt failed:', error.message)
    }
  } catch (e) {
    if (e instanceof SecretBoxError) {
      console.error('FC View legacy token re-encrypt skipped: FLICA_CREDENTIALS_KEY is not configured')
      return
    }
    console.error('FC View legacy token re-encrypt failed:', e instanceof Error ? e.name : 'error')
  }
}

/**
 * Get a valid FC View access token for the current user, refreshing if expired.
 * Returns the access token or null if no integration or refresh failed.
 * Token columns are read and written with the service role; the browser role cannot select them.
 */
export async function getValidFcvAccessToken(event: H3Event): Promise<string | null> {
  const userId = await getUserIdFromEvent(event)
  if (!userId) return null

  const { tokenUrl, clientId, clientSecret } = getFcvIntegrationEnv()

  if (!tokenUrl || !clientId || !clientSecret) return null

  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    console.error('FC View token read failed: service role client unavailable')
    return null
  }

  const { data: integration, error: selectErr } = await supabase
    .from('fcv_integrations')
    .select(
      'access_token, refresh_token, access_token_nonce, refresh_token_nonce, expires_at'
    )
    .eq('user_id', userId)
    .single()

  if (selectErr || !integration) return null

  let access: OpenedFcvToken
  let refresh: OpenedFcvToken
  try {
    access = openStoredFcvToken(integration.access_token, integration.access_token_nonce)
    refresh = openStoredFcvToken(integration.refresh_token, integration.refresh_token_nonce)
  } catch (e) {
    console.error(
      'FC View token decrypt failed:',
      e instanceof Error ? e.message : 'error'
    )
    return null
  }

  const expiresAt = new Date(integration.expires_at).getTime()
  if (Date.now() < expiresAt - EXPIRY_BUFFER_MS) {
    if (access.legacy || refresh.legacy) {
      await reencryptLegacyFcvTokens(supabase, userId, access.token, refresh.token)
    }
    return access.token
  }

  // Do not call the provider until we can store the rotated pair. A refresh that
  // succeeds and then fails to seal would drop a rotated refresh token.
  try {
    getFlicaCredentialsKey()
  } catch (e) {
    if (e instanceof SecretBoxError) {
      console.error('FC View token refresh skipped: FLICA_CREDENTIALS_KEY is not configured')
      return null
    }
    throw e
  }

  const refreshRes = await fetchFcvWithRetry(tokenUrl, {
    logLabel: 'FC View token refresh',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh.token,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!refreshRes.ok) {
    console.error('FC View token refresh failed:', refreshRes.status)
    return null
  }

  const data = (await refreshRes.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }

  if (typeof data.access_token !== 'string' || !data.access_token) {
    console.error('FC View token refresh failed: response missing access_token')
    return null
  }

  if (typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in)) {
    console.error('FC View token refresh failed: response missing expires_in')
    return null
  }

  const nextRefresh =
    typeof data.refresh_token === 'string' && data.refresh_token
      ? data.refresh_token
      : refresh.token

  let sealed: SealedFcvTokenPair
  try {
    sealed = sealFcvTokenPair(data.access_token, nextRefresh)
  } catch (e) {
    console.error(
      'FC View token refresh seal failed:',
      e instanceof Error ? e.message : 'error'
    )
    return null
  }

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const { error: updateError } = await supabase
    .from('fcv_integrations')
    .update({
      ...sealed,
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
