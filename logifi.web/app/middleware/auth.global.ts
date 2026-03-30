// Global auth middleware
// Ensures authentication state is initialized on every route
// Pages will check auth state and show AuthModal if not authenticated

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Only run on client side (since ssr: false)
  if (process.server) return

  // Initialize auth state if not already done
  // The useAuth composable will handle this, but we ensure it's called
  // This middleware runs before page components mount
  const { initAuth, isPasswordRecoverySession } = useAuth()

  await initAuth()

  if (isPasswordRecoverySession.value && to.path !== '/reset-password') {
    return navigateTo('/reset-password')
  }
})

