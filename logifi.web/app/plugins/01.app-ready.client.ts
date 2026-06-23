import { Capacitor } from '@capacitor/core'

const FALLBACK_MS = 4000

function removeHtmlSplash(): void {
  document.getElementById('app-splash')?.remove()
}

async function hideNativeSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch (error) {
    console.warn('[app-ready] SplashScreen.hide failed:', error)
  }
}

export async function markAppReady(): Promise<void> {
  removeHtmlSplash()
  await hideNativeSplash()
}

export default defineNuxtPlugin((nuxtApp) => {
  const { initAuth } = useAuth()
  void initAuth()

  let htmlSplashRemoved = false

  const removeHtmlSplashOnce = () => {
    if (htmlSplashRemoved) return
    htmlSplashRemoved = true
    removeHtmlSplash()
  }

  // Native splash must not wait for auth — dismiss as soon as JS runs.
  void hideNativeSplash()

  nuxtApp.hook('app:mounted', () => {
    removeHtmlSplashOnce()
  })

  const scheduleFallback = () => {
    window.setTimeout(() => {
      removeHtmlSplashOnce()
      void hideNativeSplash()
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
