import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

/** Capacitor iOS WebView origin (Capacitor 6+). Used to recognize in-WebView auth URLs. */
export const CAPACITOR_AUTH_ORIGIN = 'https://localhost'

/** Custom URL scheme registered in Info.plist for OAuth deep links. */
export const CAPACITOR_AUTH_SCHEME = 'io.logifi.app'

function nativeSchemeOrigin(): string {
  return `${CAPACITOR_AUTH_SCHEME}://`
}

function nativeDeepLink(path: string): string {
  const trimmed = path.replace(/^\//, '')
  return `${CAPACITOR_AUTH_SCHEME}://${trimmed}`
}

/**
 * Origin used for Supabase email/OAuth redirect URLs.
 * Web uses the current origin; native Capacitor uses the custom URL scheme
 * so Safari / Mail can return into the app (https://localhost cannot).
 */
export function getAuthRedirectOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (isCapacitorNative()) return nativeSchemeOrigin()
  return window.location.origin
}

export function buildAuthCallbackUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (isCapacitorNative()) return nativeDeepLink('/auth/callback')
  return `${window.location.origin}/auth/callback`
}

export function buildResetPasswordUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (isCapacitorNative()) return nativeDeepLink('/reset-password')
  return `${window.location.origin}/reset-password`
}

/** Map an incoming app URL (custom scheme or WebView origin) to an in-app path. */
export function pathFromAuthDeepLink(urlString: string): string | null {
  try {
    const url = new URL(urlString)
    const protocol = url.protocol.replace(':', '')

    if (protocol === CAPACITOR_AUTH_SCHEME) {
      const routePath =
        `/${url.host}${url.pathname}`.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
      return `${routePath}${url.search}${url.hash}`
    }

    if (url.origin === CAPACITOR_AUTH_ORIGIN || url.origin === 'capacitor://localhost') {
      return `${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    return null
  }
  return null
}
