import { randomBytes } from 'node:crypto'

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
