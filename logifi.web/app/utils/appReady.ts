import { Capacitor } from '@capacitor/core'

let htmlSplashRemoved = false
let splashHoldUntil = 0

/**
 * Capacitor cold open must keep #app-splash up for one propeller cycle.
 * Later calls (a sign-in that needs longer) can only extend the hold.
 * Resume does not call this.
 */
export function armSplashHoldUntil(untilMs: number): void {
  if (untilMs > splashHoldUntil) splashHoldUntil = untilMs
}

export function splashHoldRemainingMs(now = Date.now()): number {
  return Math.max(0, splashHoldUntil - now)
}

export function resetSplashHoldForTests(): void {
  splashHoldUntil = 0
}

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
  const wait = splashHoldRemainingMs()
  if (wait > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, wait)
    })
  }
  removeHtmlSplashOnce()
  await hideNativeSplash()
}

export async function hideNativeSplashNow(): Promise<void> {
  await hideNativeSplash()
}
