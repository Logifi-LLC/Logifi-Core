import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { getCompanionCaptureOrigin } from './digifiCapture'

export const GUEST_SIGN_BUCKET = 'flight-signatures'
export const GUEST_SIGN_ALLOWED_MIME = new Set(['image/png', 'image/webp', 'image/jpeg'])
export const GUEST_SIGN_MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const GUEST_SIGN_SESSION_TTL_MS = 20 * 60 * 1000

export function generateGuestSignToken(): string {
  return randomBytes(18).toString('base64url')
}

export function extForGuestSignMime(mime: string): string {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/jpeg') return 'jpg'
  return 'png'
}

export function buildMobileGuestSignUrl(event: H3Event, token: string): string {
  return `${getCompanionCaptureOrigin(event)}/guest-sign/${token}`
}
