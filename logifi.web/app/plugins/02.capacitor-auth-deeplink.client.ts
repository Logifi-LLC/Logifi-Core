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

export default defineNuxtPlugin(() => {
  if (!isCapacitorNative()) return

  const router = useRouter()

  const navigateToAuthPath = (path: string) => {
    if (!isAuthRoute(path)) return
    void router.replace(path)
  }

  void (async () => {
    try {
      const { App } = await import('@capacitor/app')

      await App.addListener('appUrlOpen', (event) => {
        const path = pathFromDeepLink(event.url)
        if (path) navigateToAuthPath(path)
      })

      const launch = await App.getLaunchUrl()
      if (launch?.url) {
        const path = pathFromDeepLink(launch.url)
        if (path) navigateToAuthPath(path)
      }
    } catch (error) {
      console.warn('[capacitor-auth-deeplink] App plugin unavailable:', error)
    }
  })()
})
