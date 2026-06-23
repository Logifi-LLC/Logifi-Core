import { isCapacitorIos } from '~/composables/useCapacitorPlatform'

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

export default defineNuxtRouteMiddleware((to) => {
  // Only run on client side (since ssr: false)
  if (process.server) return

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

  return navigateTo('/dashboard', { replace: true })
})
