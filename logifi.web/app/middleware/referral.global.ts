import { normalizeReferralCode } from '../../shared/referrals'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { storeReferralCode } from '~/utils/referralCapture'
import { isIosBrowserUserAgent, referralLinkRedirect } from '~/utils/referralLink'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const rawRef = to.query.ref
  const refQuery = Array.isArray(rawRef) ? rawRef[0] : rawRef
  const rawWeb = to.query.web
  const webSignup = (Array.isArray(rawWeb) ? rawWeb[0] : rawWeb) === '1'
  const target = referralLinkRedirect({
    path: to.path,
    refQuery: typeof refQuery === 'string' ? refQuery : null,
    webSignup,
    iosBrowser: isIosBrowserUserAgent(navigator.userAgent),
    native: isCapacitorNative(),
  })
  if (!target) return

  const code = target.query?.ref ? normalizeReferralCode(target.query.ref) : null
  if (code) storeReferralCode(code)
  return navigateTo(target, { replace: true })
})
