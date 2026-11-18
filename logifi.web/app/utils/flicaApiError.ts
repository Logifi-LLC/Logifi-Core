import { LIVE_IOS_API_BASE } from './apiBase'

const IOS_API_HINT = `Rebuild TestFlight with NUXT_PUBLIC_API_BASE=${LIVE_IOS_API_BASE} (dev.logifi.io is not a live host).`

export const FLICA_NETWORK_ERROR_PROD =
  "Couldn't reach Autofi. Try again when you have a connection."

export const FLICA_API_NOT_FOUND_PROD = "Autofi isn't available on this server."

function networkUnreachableMessage(): string {
  if (import.meta.dev) {
    return `Could not reach the Autofi API from this device. ${IOS_API_HINT}`
  }
  return FLICA_NETWORK_ERROR_PROD
}

function apiNotFoundMessage(): string {
  if (import.meta.dev) {
    return `FLICA API not found on this server. ${IOS_API_HINT}`
  }
  return FLICA_API_NOT_FOUND_PROD
}

function isNetworkFailureMessage(message: string): boolean {
  return (
    /load failed/i.test(message) ||
    /failed to fetch/i.test(message) ||
    /<no response>/i.test(message) ||
    /networkerror/i.test(message)
  )
}

/**
 * Turn ofetch / WKWebView failures into a short Autofi error.
 * `[POST] "https://dev.logifi.io/api/flica/connect": <no response> Load failed`
 * is DNS/CORS, not a FLICA password rejection.
 */
export function messageFromFlicaApiError(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const rec = e as { data?: unknown; statusCode?: number; statusMessage?: string; message?: string }
    const data = rec.data
    if (data && typeof data === 'object') {
      const d = data as { statusMessage?: unknown; message?: unknown }
      if (typeof d.statusMessage === 'string' && d.statusMessage.trim()) return d.statusMessage.trim()
      if (typeof d.message === 'string' && d.message.trim()) return d.message.trim()
    }
    if (typeof rec.statusMessage === 'string' && rec.statusMessage.trim()) return rec.statusMessage.trim()
    if (rec.statusCode === 404) {
      return apiNotFoundMessage()
    }
    if (typeof rec.message === 'string' && rec.message.trim()) {
      if (isNetworkFailureMessage(rec.message)) {
        return networkUnreachableMessage()
      }
      return rec.message.trim()
    }
  }
  if (e instanceof Error && e.message.trim()) {
    if (isNetworkFailureMessage(e.message)) {
      return networkUnreachableMessage()
    }
    return e.message.trim()
  }
  return fallback
}
