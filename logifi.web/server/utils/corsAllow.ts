/**
 * Origins the Capacitor WebView uses when calling `/api/*` cross-origin.
 * WKWebView origin is `https://localhost` on Capacitor 6+ (iosScheme https).
 */
export const CAPACITOR_API_ORIGINS = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
])

const DEFAULT_ALLOW_HEADERS = ['authorization', 'content-type', 'accept']

export function isCapacitorApiOrigin(origin: string | undefined): origin is string {
  return !!origin && CAPACITOR_API_ORIGINS.has(origin)
}

/**
 * Safari/WKWebView often lists `Accept` on the preflight even though it is
 * CORS-safelisted. A fixed Allow-Headers list that omits a requested name
 * fails the preflight with "Load failed" / no response.
 */
export function resolveCorsAllowHeaders(requestHeaders?: string): string {
  const extra = (requestHeaders ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([...DEFAULT_ALLOW_HEADERS, ...extra])].join(', ')
}
