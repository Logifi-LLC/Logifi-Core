import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

/** Capacitor iOS WebView origin (Capacitor 6+). Must match Supabase redirect allow list. */
export const CAPACITOR_AUTH_ORIGIN = 'https://localhost'

/** Custom URL scheme registered in Info.plist for OAuth deep links. */
export const CAPACITOR_AUTH_SCHEME = 'io.logifi.app'

/**
 * Origin used for Supabase email/OAuth redirect URLs.
 * Web uses the current origin; native Capacitor uses the local WebView origin.
 */
export function getAuthRedirectOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (isCapacitorNative()) return CAPACITOR_AUTH_ORIGIN
  return window.location.origin
}

export function buildAuthCallbackUrl(): string | undefined {
  const origin = getAuthRedirectOrigin()
  return origin ? `${origin}/auth/callback` : undefined
}

export function buildResetPasswordUrl(): string | undefined {
  const origin = getAuthRedirectOrigin()
  return origin ? `${origin}/reset-password` : undefined
}
