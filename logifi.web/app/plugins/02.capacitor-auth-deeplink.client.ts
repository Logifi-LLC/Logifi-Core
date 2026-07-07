import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { CAPACITOR_AUTH_ORIGIN, CAPACITOR_AUTH_SCHEME } from '~/utils/authRedirectOrigin'

function pathFromDeepLink(urlString: string): string | null {
  try {
    const url = new URL(urlString)
    const protocol = url.protocol.replace(':', '')

    if (protocol === CAPACITOR_AUTH_SCHEME) {
      const path = `/${url.host}${url.pathname}${url.search}${url.hash}`
      return path.replace(/\/{2,}/g, '/')
    }

    if (url.origin === CAPACITOR_AUTH_ORIGIN || url.origin === 'capacitor://localhost') {
      return `${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    return null
  }
  return null
}

function isAuthRoute(path: string): boolean {
  return path.includes('/auth/callback') || path.includes('/reset-password')
}

/** FC View OAuth return (io.logifi.app://dashboard?fcv=connected|error). */
function isFcvReturn(path: string): boolean {
  return /[?&]fcv=/.test(path)
}

/** The FC View OAuth flow runs in an in-app browser; close it once we return. */
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

  const handleDeepLink = (path: string) => {
    if (isFcvReturn(path)) {
      void closeInAppBrowser()
      void router.replace(path)
      return
    }
    if (isAuthRoute(path)) {
      void router.replace(path)
    }
  }

  void (async () => {
    try {
      const { App } = await import('@capacitor/app')

      await App.addListener('appUrlOpen', (event) => {
        const path = pathFromDeepLink(event.url)
        if (path) handleDeepLink(path)
      })

      const launch = await App.getLaunchUrl()
      if (launch?.url) {
        const path = pathFromDeepLink(launch.url)
        if (path) handleDeepLink(path)
      }
    } catch (error) {
      console.warn('[capacitor-auth-deeplink] App plugin unavailable:', error)
    }
  })()
})
