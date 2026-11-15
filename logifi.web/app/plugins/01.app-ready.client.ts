import { lockNativeViewportZoom } from '~/composables/useCapacitorPlatform'
import { isDashboardPath, markAppReady, removeHtmlSplashOnce } from '~/utils/appReady'

const FALLBACK_MS = 6000

export { markAppReady }

export default defineNuxtPlugin((nuxtApp) => {
  lockNativeViewportZoom()

  const { initAuth } = useAuth()
  void initAuth()

  nuxtApp.hook('app:mounted', () => {
    const path = window.location.pathname
    // Dashboard holds the HTML splash until local prefs/IndexedDB hydrate.
    if (isDashboardPath(path)) return
    removeHtmlSplashOnce()
  })

  const scheduleFallback = () => {
    window.setTimeout(() => {
      void markAppReady()
    }, FALLBACK_MS)
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'complete') {
      scheduleFallback()
    } else {
      window.addEventListener('load', scheduleFallback, { once: true })
    }
  }
})
