import { normalizeReferralCode } from '../../shared/referrals'

export function isIosBrowserUserAgent(userAgent: string): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent)
}

export interface ReferralLinkTarget {
  path: string
  query?: Record<string, string>
}

/**
 * Where a referral URL should go.
 * Desktop `/r/CODE` stays on the current landing page via `/?ref=`.
 * An iOS browser sees the code page. The installed app handles the link itself.
 */
export function referralLinkRedirect(input: {
  path: string
  refQuery: string | null
  webSignup: boolean
  iosBrowser: boolean
  native: boolean
}): ReferralLinkTarget | null {
  const path = input.path.length > 1 && input.path.endsWith('/') ? input.path.slice(0, -1) : input.path
  const codeMatch = path.match(/^\/r\/([^/]+)$/)
  const pathCode = codeMatch ? normalizeReferralCode(decodeURIComponent(codeMatch[1] ?? '')) : null
  const isReferralPath = path === '/r' || path.startsWith('/r/')

  if (isReferralPath) {
    if (input.native) {
      return pathCode ? { path: '/dashboard', query: { ref: pathCode } } : { path: '/dashboard' }
    }
    if (!input.iosBrowser) {
      return pathCode ? { path: '/', query: { ref: pathCode } } : { path: '/' }
    }
    return null
  }

  if (path !== '/' || input.native || input.webSignup || !input.iosBrowser) return null
  const queryCode = normalizeReferralCode(input.refQuery)
  if (!queryCode) return null
  return { path: `/r/${queryCode}` }
}
