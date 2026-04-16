import type { H3Event } from 'h3'
import { getSupabaseClient, getUserIdFromEvent } from './supabase'
import { fetchFcvWithRetry } from './fcvRetryFetch'

const EXPIRY_BUFFER_MS = 60 * 1000 // refresh if expires within 60 seconds

/**
 * Get a valid FC View access token for the current user, refreshing if expired.
 * Returns the access token or null if no integration or refresh failed.
 */
export async function getValidFcvAccessToken(event: H3Event): Promise<string | null> {
  const userId = await getUserIdFromEvent(event)
  if (!userId) return null

  const config = useRuntimeConfig()
  const tokenUrl = config.fcvTokenUrl as string
  const clientId = config.fcvClientId as string
  const clientSecret = config.fcvClientSecret as string

  if (!tokenUrl || !clientId || !clientSecret) return null

  const supabase = getSupabaseClient(event)
  const { data: integration, error: selectErr } = await supabase
    .from('fcv_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (selectErr || !integration) return null

  const expiresAt = new Date(integration.expires_at).getTime()
  if (Date.now() < expiresAt - EXPIRY_BUFFER_MS) {
    return integration.access_token
  }

  const refreshRes = await fetchFcvWithRetry(tokenUrl, {
    logLabel: 'FC View token refresh',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token,
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

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const { error: updateError } = await supabase
    .from('fcv_integrations')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? integration.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('FC View token update failed:', updateError)
    return null
  }

  return data.access_token
}
