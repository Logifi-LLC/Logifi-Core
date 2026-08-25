import { supabase } from '~/lib/supabase'

export type ConsumeAuthRedirectResult = {
  consumed: boolean
  error?: string
}

/**
 * Establish a Supabase session from an OAuth/email redirect URL.
 * Native deeplinks arrive after the Auth client has already initialized, so
 * detectSessionInUrl will not see these params unless we consume them here.
 */
export async function consumeAuthRedirect(urlString: string): Promise<ConsumeAuthRedirectResult> {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return { consumed: false }
  }

  const code = url.searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return { consumed: false, error: error.message }
    return { consumed: true }
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) return { consumed: false, error: error.message }
    return { consumed: true }
  }

  return { consumed: false }
}
