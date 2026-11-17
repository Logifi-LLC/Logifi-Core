import { entryHasDrawnInkSignature } from './flightSignatureDisplay'

/** Whether the drawer should try to resolve and show drawn ink for this signed entry. */
export function shouldAttemptDrawnSignatureLoad(
  isSigned: boolean,
  meta: {
    sign_method?: string | null
    drawn_signature_url?: string | null
  } | null | undefined
): boolean {
  if (!isSigned) return false
  if (entryHasDrawnInkSignature(meta)) return true
  const method = meta?.sign_method
  return !method || method === 'guest_drawn'
}