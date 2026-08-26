import {
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  setResponseHeader,
  setResponseStatus,
} from 'h3'
import { isCapacitorApiOrigin, resolveCorsAllowHeaders } from '../utils/corsAllow'

/**
 * CORS for the native app. The Capacitor iOS WebView serves the app from `https://localhost`
 * (Capacitor 6+) and calls this API cross-origin via `NUXT_PUBLIC_API_BASE`. Without these
 * headers WKWebView blocks the request before any response ("Load failed"). Web (same-origin)
 * requests are unaffected. Scoped to `/api/*` so nothing else changes.
 */
export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  if (!pathname.startsWith('/api/')) return

  const origin = getRequestHeader(event, 'origin')
  if (!isCapacitorApiOrigin(origin)) return

  setResponseHeader(event, 'Access-Control-Allow-Origin', origin)
  setResponseHeader(event, 'Vary', 'Origin')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  setResponseHeader(
    event,
    'Access-Control-Allow-Headers',
    resolveCorsAllowHeaders(getRequestHeader(event, 'access-control-request-headers'))
  )
  setResponseHeader(event, 'Access-Control-Max-Age', '86400')

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
