import { normalizeReferralCode, referralShareUrl, REFERRAL_STORAGE_KEY } from '../../shared/referrals'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10

export function captureReferralFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return normalizeReferralCode(params.get('ref'))
}

export function readStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = normalizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY))
    if (stored) return stored
  } catch {
    // Private mode can throw on localStorage.
  }
  const match = document.cookie.match(/(?:^|; )logifi_ref=([^;]*)/)
  const raw = match?.[1]
  return raw ? normalizeReferralCode(decodeURIComponent(raw)) : null
}

export function storeReferralCode(code: string): void {
  const normalized = normalizeReferralCode(code)
  if (!normalized || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized)
  } catch {
    // Cookie below still keeps the code.
  }
  document.cookie = `logifi_ref=${normalized}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch {
    // Ignore.
  }
  document.cookie = 'logifi_ref=; Path=/; Max-Age=0; SameSite=Lax'
}

/** Web shares the current origin. The native app shares www, not the WebView host. */
export function shareUrlForClient(code: string, native: boolean, origin: string): string {
  return referralShareUrl(code, native ? null : origin)
}

export async function shareReferralLink(url: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Logifi', url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared'
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
