export type InAppBackRouter = {
  back: () => void
}

type ClientNavigate = (to: string) => unknown

/** Nuxt auto-imports `navigateTo`. Tests stub the same name on globalThis. */
function clientNavigate(to: string): void {
  const host = globalThis as typeof globalThis & { navigateTo?: ClientNavigate }
  const navigate = typeof host.navigateTo === 'function' ? host.navigateTo : navigateTo
  void navigate(to)
}

/**
 * Vue Router stores the previous in-app URL on `history.state.back`.
 * WKWebView's `history.length` is greater than 1 for the document that loaded
 * the shell, so `history.back()` fetches that document again and the launch
 * splash runs. Only go back when Vue Router recorded an in-app entry.
 */
export function inAppHistoryBack(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null
  const back = (state as { back?: unknown }).back
  if (typeof back !== 'string') return null
  if (!back.startsWith('/') || back.startsWith('//')) return null
  return back
}

/** `router.back()` when the previous entry is in-app. Otherwise a client `navigateTo`. */
export function goBackInApp(
  router: InAppBackRouter,
  fallback = '/dashboard',
  state: unknown = typeof history !== 'undefined' ? history.state : null,
): 'back' | 'fallback' {
  if (inAppHistoryBack(state)) {
    router.back()
    return 'back'
  }
  clientNavigate(fallback)
  return 'fallback'
}
