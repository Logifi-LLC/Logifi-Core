import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { pathFromAuthDeepLink } from '~/utils/authRedirectOrigin'
import { consumeAuthRedirect } from '~/utils/consumeAuthRedirect'

function isAuthRoute(path: string): boolean {
  return path.includes('/auth/callback') || path.includes('/reset-password')
}

/** FC View OAuth return (io.logifi.app://dashboard?fcv=connected|error). */
function isFcvReturn(path: string): boolean {
  return /[?&]fcv=/.test(path)
}

/** Google OAuth and FC View both run in an in-app browser; close it once we return. */
async function closeInAppBrowser() {
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
  } catch {
    // Browser plugin not present or nothing open — safe to ignore.
  }
}

export default defineNuxtPlugin(() => {
  if (!isCapacitorNative()) return

  const router = useRouter()

  const handleDeepLink = (path: string, rawUrl: string) => {
    if (!isFcvReturn(path) && !isAuthRoute(path)) return

    void (async () => {
      if (isAuthRoute(path)) {
        await consumeAuthRedirect(rawUrl)
      }
      await closeInAppBrowser()
      await router.replace(path)
    })()
  }

  void (async () => {
    try {
      const { App } = await import('@capacitor/app')

      await App.addListener('appUrlOpen', (event) => {
        const path = pathFromAuthDeepLink(event.url)
        if (path) handleDeepLink(path, event.url)
      })

      const launch = await App.getLaunchUrl()
      if (launch?.url) {
        const path = pathFromAuthDeepLink(launch.url)
        if (path) handleDeepLink(path, launch.url)
      }
    } catch (error) {
      console.warn('[capacitor-auth-deeplink] App plugin unavailable:', error)
    }
  })()
})
