import { isCapacitorIos } from '~/composables/useCapacitorPlatform'
import { captureReferralFromSearch, storeReferralCode } from '~/utils/referralCapture'

// Global auth middleware
// Ensures authentication state is initialized on every route
// Pages will check auth state and show AuthModal if not authenticated

function routeHasAuthCallback(to: {
  path: string
  query: Record<string, unknown>
  hash: string
}): boolean {
  if (to.path !== '/') return false

  if (to.query.code || to.query.error || to.query.error_description) {
    return true
  }

  const hash = (to.hash || '').replace(/^#/, '')
  if (!hash) return false

  const hashParams = new URLSearchParams(hash)
  return (
    hashParams.has('access_token') ||
    hashParams.has('error') ||
    hashParams.has('error_description')
  )
}

function rememberReferralQuery(query: Record<string, unknown>) {
  const raw = query.ref
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string' || !value) return
  const code = captureReferralFromSearch(`?ref=${encodeURIComponent(value)}`)
  if (code) storeReferralCode(code)
}

export default defineNuxtRouteMiddleware((to) => {
  // Only run on client side (since ssr: false)
  if (process.server) return

  rememberReferralQuery(to.query)

  const { initAuth, isPasswordRecoverySession } = useAuth()

  void initAuth().then(() => {
    if (isPasswordRecoverySession.value && to.path !== '/reset-password') {
      navigateTo('/reset-password')
    }
  })

  // iOS app: skip marketing landing; open dashboard (login modal if needed)
  if (!isCapacitorIos()) return

  if (to.path !== '/') return

  if (routeHasAuthCallback(to)) {
    return navigateTo({
      path: '/auth/callback',
      query: to.query,
      hash: to.hash,
    })
  }

  const ref = to.query.ref
  const refValue = Array.isArray(ref) ? ref[0] : ref
  return navigateTo(
    {
      path: '/dashboard',
      query: typeof refValue === 'string' && refValue ? { ref: refValue } : undefined,
    },
    { replace: true }
  )
})
