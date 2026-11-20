import { isCapacitorNative, lockNativeViewportZoom } from '~/composables/useCapacitorPlatform'
import { hideNativeSplashNow, isDashboardPath, markAppReady, removeHtmlSplashOnce } from '~/utils/appReady'
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

  // The launch storyboard covers the webview. Hide it so the HTML propeller
  // is the cold-open animation. The first hide can no-op if showOnLaunch has
  // not marked the view visible yet, so retry once.
  if (isCapacitorNative()) {
    void hideNativeSplashNow()
    window.setTimeout(() => {
      void hideNativeSplashNow()
    }, 50)
  }

  const { initAuth } = useAuth()
  void initAuth()

  nuxtApp.hook('app:mounted', () => {
    const path = window.location.pathname
    if (isDashboardPath(path)) return
    // The website drops the splash on marketing routes. Capacitor opens at /
    // and then replaces to /dashboard, so the propeller stays up.
    if (isCapacitorNative()) return
    removeHtmlSplashOnce()
  })

  const scheduleFallback = () => {
    const ms = splashFallbackMs(window.location.pathname, isCapacitorNative())
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
