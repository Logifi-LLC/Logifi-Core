import { Capacitor } from '@capacitor/core'

let htmlSplashRemoved = false

function removeHtmlSplash(): void {
  if (typeof document === 'undefined') return
  document.getElementById('app-splash')?.remove()
}

async function hideNativeSplash(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!Capacitor.isNativePlatform()) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    // fadeOutDuration 0. A second hide is a no-op once the launch view is gone.
    // An early hide can no-op if showOnLaunch has not set isVisible yet, so
    // callers retry once the view is up.
    await SplashScreen.hide({ fadeOutDuration: 0 })
  } catch (error) {
    console.warn('[app-ready] SplashScreen.hide failed:', error)
  }
}

export function isDashboardPath(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/')
}

export function removeHtmlSplashOnce(): void {
  if (htmlSplashRemoved) return
  htmlSplashRemoved = true
  removeHtmlSplash()
}

export async function markAppReady(): Promise<void> {
  removeHtmlSplashOnce()
  await hideNativeSplash()
}

export async function hideNativeSplashNow(): Promise<void> {
  await hideNativeSplash()
}
