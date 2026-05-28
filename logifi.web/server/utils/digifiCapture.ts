import { randomBytes } from 'node:crypto'
import os from 'node:os'
import { getRequestURL } from 'h3'
import type { H3Event } from 'h3'

export type DigifiCapturePageSide = 'left' | 'right'

export function parseDigifiCapturePageSide(value: string | undefined): DigifiCapturePageSide | null {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'left' || normalized === 'right') return normalized
  return null
}

export function labelDigifiCapturePageSide(pageSide: DigifiCapturePageSide): string {
  return pageSide === 'left' ? 'Left page' : 'Right page'
}

export const DIGIFI_CAPTURE_BUCKET = 'digifi-capture'
export const DIGIFI_CAPTURE_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const DIGIFI_CAPTURE_MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const DIGIFI_CAPTURE_SESSION_TTL_MS = 20 * 60 * 1000
export const DIGIFI_CAPTURE_MAX_PHOTOS_PER_SESSION = 30

export function generateDigifiCaptureToken(): string {
  return randomBytes(18).toString('base64url')
}

export function extForCaptureMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function isLinkLocalIPv4(address: string): boolean {
  return address.startsWith('169.254.')
}

function isPrivateRoutableIPv4(address: string): boolean {
  if (isLinkLocalIPv4(address)) return false
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

/** Prefer Wi‑Fi/LAN private IPs over link-local (169.254.x.x, e.g. AWDL). */
export function pickLanIPv4FromAddresses(addresses: string[]): string | null {
  const routable = addresses.filter(isPrivateRoutableIPv4)
  if (routable.length > 0) return routable[0]
  const fallback = addresses.filter((a) => !a.startsWith('127.') && !isLinkLocalIPv4(a))
  return fallback[0] ?? null
}

function getLanIPv4(): string | null {
  const addresses: string[] = []
  const nets = os.networkInterfaces()
  for (const iface of Object.values(nets)) {
    if (!iface) continue
    for (const net of iface) {
      const family = net.family as string | number
      const isIPv4 = family === 'IPv4' || family === 4
      if (isIPv4 && !net.internal) addresses.push(net.address)
    }
  }
  return pickLanIPv4FromAddresses(addresses)
}

function devUsesHttps(): boolean {
  return Boolean(
    process.env.NUXT_DEV_HTTPS_KEY?.trim() && process.env.NUXT_DEV_HTTPS_CERT?.trim()
  )
}

function getDevCompanionCaptureOrigin(): string {
  const hostname = getLanIPv4() ?? '127.0.0.1'
  const port = process.env.NUXT_DEV_PORT || process.env.PORT || '3000'
  const protocol = devUsesHttps() ? 'https' : 'http'
  return `${protocol}://${hostname}:${port}`
}

function isUnreachableFromPhoneHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === '0.0.0.0' || h === '[::]' || h === 'localhost' || h === '127.0.0.1'
}

/** Origin phones can open for companion capture QR/links. */
export function getCompanionCaptureOrigin(event: H3Event): string {
  const config = useRuntimeConfig()
  const configured = (
    config.public.companionCaptureOrigin as string | undefined
  )?.trim()
  if (configured) return configured.replace(/\/$/, '')

  // Dev: auto-detect LAN IP (same Wi‑Fi as phone); override with NUXT_PUBLIC_COMPANION_CAPTURE_ORIGIN.
  if (process.dev) return getDevCompanionCaptureOrigin()

  const url = getRequestURL(event)
  let protocol = url.protocol.replace(':', '')
  let hostname = url.hostname
  const port = url.port

  if (isUnreachableFromPhoneHost(hostname)) {
    const lanIp = getLanIPv4()
    if (lanIp) hostname = lanIp
  }

  // Prefer HTTP for LAN companion capture when inferring from request.
  if (protocol === 'https' && !hostname.includes('.')) {
    protocol = 'http'
  }

  const hostWithPort =
    port && !((protocol === 'https' && port === '443') || (protocol === 'http' && port === '80'))
      ? `${hostname}:${port}`
      : hostname

  return `${protocol}://${hostWithPort}`
}

export function buildMobileCaptureUrl(event: H3Event, token: string): string {
  return `${getCompanionCaptureOrigin(event)}/digifi-capture/${token}`
}
