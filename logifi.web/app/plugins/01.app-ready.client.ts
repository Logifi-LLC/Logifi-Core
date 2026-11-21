import { isCapacitorNative, lockNativeViewportZoom } from '~/composables/useCapacitorPlatform'
import { armSplashHoldUntil, hideNativeSplashNow, isDashboardPath, markAppReady, removeHtmlSplashOnce, whenHtmlSplashMarkPainted } from '~/utils/appReady'
import { PROPELLER_CYCLE_MS, armDocumentBootOnce, markColdBootStart, splashFallbackMs } from '~/utils/bootHold'

export { markAppReady }

export default defineNuxtPlugin((nuxtApp) => {
  // Once per document. A client route change must not arm the splash again.
  if (!armDocumentBootOnce()) return
  markColdBootStart()

  // Nuxt removes #__nuxt-loader on suspense, including the <style> and #app-splash
  // inside it. Keep both. The style is what hides the wordmark and runs the spin.
  const loader = document.getElementById('__nuxt-loader')
  const splashStyle = loader?.querySelector('style')
  if (splashStyle) document.head.appendChild(splashStyle)

  const splash = document.getElementById('app-splash')
  if (splash && splash.parentElement !== document.body) {
    document.body.appendChild(splash)
  }

  lockNativeViewportZoom()

  // showOnLaunch adds the storyboard on the next main-queue turn and ignores
  // hide() until isVisible is set. launchShowDuration 0 skips that overlay.
  // Hide only after the HTML mark has been painted, with fadeOutDuration 0,
  // so the launch image cuts to the propeller instead of fading over it.
  // Retries cover a hide that landed before isVisible. This hide does not
  // remove the HTML splash. markAppReady still waits out the cycle first.
  if (isCapacitorNative()) {
    armSplashHoldUntil(Date.now() + PROPELLER_CYCLE_MS)
    void whenHtmlSplashMarkPainted().then(() => {
      const hideStarted = Date.now()
      const hideLaunchSplash = () => {
        void hideNativeSplashNow()
      }
      hideLaunchSplash()
      const hideTimer = window.setInterval(() => {
        hideLaunchSplash()
        if (Date.now() - hideStarted >= 1600) window.clearInterval(hideTimer)
      }, 100)
    })
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
