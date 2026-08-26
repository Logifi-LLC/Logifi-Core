/**
 * Capacitor iOS has no Nitro server. `NUXT_PUBLIC_API_BASE` is baked in at
 * `cap:sync`. Docs used to tell TestFlight builds to use https://dev.logifi.io,
 * but that hostname has no DNS (NXDOMAIN). WKWebView then reports
 * `[POST] "https://dev.logifi.io/api/…": <no response> Load failed`.
 *
 * Keep mapping known-dead hosts to the live API so a rebuild works even if
 * `.env` still has the old value.
 */
const UNROUTED_API_BASES: Record<string, string> = {
  'https://dev.logifi.io': 'https://www.logifi.io',
  'http://dev.logifi.io': 'https://www.logifi.io',
}

export const LIVE_IOS_API_BASE = 'https://www.logifi.io'

export function canonicalizeApiBase(base: string): string {
  const trimmed = base.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  return UNROUTED_API_BASES[trimmed.toLowerCase()] ?? trimmed
}
