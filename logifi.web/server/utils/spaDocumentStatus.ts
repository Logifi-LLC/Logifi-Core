/**
 * Document status for the SPA shell.
 *
 * `ssr: false` still renders through Nitro, and unknown paths match the
 * client catch-all only after JavaScript runs. That made every URL HTTP 200.
 * Known app routes keep 200 so deep links, /digifi, and auth callbacks load
 * the shell. Everything else is marked 404 before the renderer writes HTML,
 * and the client catch-all still shows the branded page.
 *
 * Asset and API paths are left alone so their own handlers set the status.
 */

const EXACT_APP_PATHS = new Set([
  '/',
  '/auth/callback',
  '/dashboard',
  '/data-sources',
  '/developers',
  '/digifi',
  '/digifi-eye',
  '/digifi-scan',
  '/feedback',
  '/integrations',
  '/logbook-builder',
  '/pricing',
  '/privacy',
  '/reset-password',
  '/terms',
])

const DYNAMIC_APP_PATHS = [
  /^\/digifi-capture\/[^/]+$/,
  /^\/guest-sign\/[^/]+$/,
]

export function normalizeDocumentPath(pathname: string): string {
  const path = pathname.split('?')[0]?.split('#')[0] || '/'
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

/** True when this request is not an HTML document we should re-status. */
export function isPassthroughDocumentPath(pathname: string): boolean {
  const path = normalizeDocumentPath(pathname)
  if (path.startsWith('/api')) return true
  if (path.startsWith('/_')) return true
  return path.includes('.')
}

export function isKnownAppPath(pathname: string): boolean {
  const path = normalizeDocumentPath(pathname)
  if (EXACT_APP_PATHS.has(path)) return true
  return DYNAMIC_APP_PATHS.some((pattern) => pattern.test(path))
}
