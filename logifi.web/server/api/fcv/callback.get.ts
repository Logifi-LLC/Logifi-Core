import { type H3Event, defineEventHandler, getQuery, getRequestURL, setResponseHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../app/types/database'
import { verifyFcvState } from '../../utils/fcvState'
import { fetchFcvWithRetry } from '../../utils/fcvRetryFetch'
import { getFcvIntegrationEnv } from '../../utils/fcvEnv'

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
}

/**
 * OAuth callbacks are sometimes loaded in a popup or iframe. A bare 302 can leave the wrong
 * window stuck on an error page while the provider script tries to navigate it, which triggers
 * Chrome's "Unsafe attempt to load URL … from frame with URL chrome-error://chromewebdata/".
 * This response runs in the callback context and moves the opener or top window when possible.
 */
function sendHtmlAutoRedirect(event: H3Event, targetUrl: string) {
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  const href = escapeHtmlAttr(targetUrl)
  const asJson = JSON.stringify(targetUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${href}">
  <title>Redirecting…</title>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;padding:1.5rem">Redirecting…</p>
  <p style="font-family:system-ui,sans-serif;padding:0 1.5rem"><a href="${href}">Continue to Logifi</a></p>
  <script>
(function () {
  var target = ${asJson};
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.location.replace(target);
      window.close();
      return;
    }
  } catch (e) {}
  try {
    if (window.top !== window.self) {
      window.top.location.replace(target);
      return;
    }
  } catch (e2) {}
  window.location.replace(target);
})();
  </script>
</body>
</html>`
}

const redirectWithFcvError = (event: any, reason: string) => {
  const appOrigin = getRequestURL(event).origin
  const returnPath = '/dashboard'
  const params = new URLSearchParams({
    fcv: 'error',
    reason,
  })
  return sendHtmlAutoRedirect(event, `${appOrigin}${returnPath}?${params.toString()}`)
}

/**
 * FC View OAuth callback: exchange code for tokens, store in fcv_integrations, redirect to app.
 * All token handling is server-side; client never sees code or tokens.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const providerError = query.error as string | undefined
  const providerErrorDescription = query.error_description as string | undefined

  if (providerError) {
    const reason = clean(providerErrorDescription) || clean(providerError) || 'Authorization was denied by FC View.'
    return redirectWithFcvError(event, reason)
  }

  const config = useRuntimeConfig()
  const fcv = getFcvIntegrationEnv()
  const secret = fcv.clientSecret
  const clientId = fcv.clientId
  const clientSecret = fcv.clientSecret
  const redirectUri = fcv.redirectUri
  const tokenUrl = fcv.tokenUrl
  const supabaseUrl = clean(config.public.supabaseUrl)
  const serviceRoleKey = clean(config.supabaseServiceRoleKey)

  if (!code || !state || !secret || !clientId || !clientSecret || !redirectUri || !tokenUrl) {
    return redirectWithFcvError(event, 'FC View callback is missing required parameters or configuration.')
  }

  const userId = verifyFcvState(state, secret)
  if (!userId) {
    return redirectWithFcvError(event, 'Invalid FC View callback state. Please try connecting again.')
  }

  const tokenRes = await fetchFcvWithRetry(tokenUrl, {
    logLabel: 'FC View token exchange',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    console.error('FC View token exchange failed:', tokenRes.status, errText)
    return redirectWithFcvError(
      event,
      'FC View rejected the authorization request for this client account.'
    )
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  if (!serviceRoleKey) {
    return redirectWithFcvError(
      event,
      'Server configuration is incomplete for FC View integration.'
    )
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { error: upsertError } = await supabase.from('fcv_integrations').upsert(
    {
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    }
  )

  if (upsertError) {
    console.error('fcv_integrations upsert failed:', upsertError)
    return redirectWithFcvError(event, 'Connected to FC View but failed to save integration.')
  }

  const appOrigin = getRequestURL(event).origin
  const returnPath = '/dashboard'
  const redirectTo = `${appOrigin}${returnPath}?fcv=connected`
  return sendHtmlAutoRedirect(event, redirectTo)
})
