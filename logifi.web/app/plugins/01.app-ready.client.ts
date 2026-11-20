import { lockNativeViewportZoom } from '~/composables/useCapacitorPlatform'
import { isDashboardPath, markAppReady, removeHtmlSplashOnce } from '~/utils/appReady'
import { markColdBootStart, splashFallbackMs } from '~/utils/bootHold'

export { markAppReady }

export default defineNuxtPlugin((nuxtApp) => {
  markColdBootStart()

  // Nuxt removes #__nuxt-loader when the app suspends. Keep #app-splash until the handoff below.
  const splash = document.getElementById('app-splash')
  if (splash && splash.parentElement !== document.body) {
    document.body.appendChild(splash)
  }

  lockNativeViewportZoom()

  const { initAuth } = useAuth()
  void initAuth()

  nuxtApp.hook('app:mounted', () => {
    const path = window.location.pathname
    // Marketing and other non-dashboard routes drop the splash on mount.
    // No propeller minimum hold on those pages.
    if (isDashboardPath(path)) return
    removeHtmlSplashOnce()
  })

  const scheduleFallback = () => {
    const ms = splashFallbackMs(window.location.pathname)
    window.setTimeout(() => {
      void markAppReady()
    }, ms)
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'complete') {
      scheduleFallback()
    } else {
      window.addEventListener('load', scheduleFallback, { once: true })
    }
  }
})
