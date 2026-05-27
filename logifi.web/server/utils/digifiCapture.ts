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

/** Phone-reachable dev origin for QR/links (must match dev server scheme — Nuxt HTTPS uses https). */
export const DEFAULT_COMPANION_CAPTURE_ORIGIN = 'https://172.20.10.4:3000'

export function generateDigifiCaptureToken(): string {
  return randomBytes(18).toString('base64url')
}

export function extForCaptureMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function getLanIPv4(): string | null {
  const nets = os.networkInterfaces()
  for (const iface of Object.values(nets)) {
    if (!iface) continue
    for (const net of iface) {
      const family = net.family as string | number
      const isIPv4 = family === 'IPv4' || family === 4
      if (isIPv4 && !net.internal) return net.address
    }
  }
  return null
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

  // Dev default: fixed LAN HTTP URL (works with pnpm dev --host 0.0.0.0 --port 3000 on phone Wi‑Fi).
  if (process.dev) return DEFAULT_COMPANION_CAPTURE_ORIGIN

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
