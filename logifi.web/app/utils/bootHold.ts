import { isDashboardPath } from './appReady'

/** One propeller cycle. Reduced motion keeps the static mark for this same hold. */
export const PROPELLER_CYCLE_MS = 2800

/** Ceiling on the post-sign-in / cold-open wait for the first inbound sync. */
export const FULL_SYNC_HOLD_CAP_MS = 15_000

/** Safety net for marketing and other non-dashboard routes. Not a minimum hold. */
export const MARKETING_SPLASH_FALLBACK_MS = 6000

export type BootHoldReason = 'cold-open' | 'sign-in' | 'resume'

let coldBootStartedAt = 0

/** First client start. Later calls (including resume) do not move the clock. */
export function markColdBootStart(now = Date.now()): void {
  if (coldBootStartedAt === 0) coldBootStartedAt = now
}

export function getColdBootStartedAt(now = Date.now()): number {
  return coldBootStartedAt || now
}

/** Resume from background must not replay the propeller. */
export function shouldStartBootHold(reason: BootHoldReason): boolean {
  return reason !== 'resume'
}

/**
 * Cold open counts time from process start so a cycle already on screen counts.
 * Sign-in starts a new cycle. Resume returns null.
 */
export function bootHoldStartedAt(input: {
  reason: BootHoldReason
  now: number
  coldBootStartedAt: number
}): number | null {
  if (!shouldStartBootHold(input.reason)) return null
  if (input.reason === 'sign-in') return input.now
  return input.coldBootStartedAt
}

export type BootRevealState = {
  holdStartedAt: number
  now: number
  /** First inbound sync settled (success or failure). */
  syncDone: boolean
  /** Cloud is unreachable. Cached data can show after the cycle. */
  offline: boolean
  minHoldMs?: number
  capMs?: number
}

/**
 * Reveal after one propeller cycle and the first inbound sync, whichever is later.
 * Offline skips the sync wait. The cap is the longest the hold runs.
 * Motion preference does not change the times.
 */
export function shouldRevealDashboard(state: BootRevealState): boolean {
  const minHoldMs = state.minHoldMs ?? PROPELLER_CYCLE_MS
  const capMs = state.capMs ?? FULL_SYNC_HOLD_CAP_MS
  const elapsed = state.now - state.holdStartedAt
  if (elapsed < minHoldMs) return false
  if (state.offline || state.syncDone) return true
  return elapsed >= capMs
}

type Sleep = (ms: number) => Promise<void>

const defaultSleep: Sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms)
})

export async function waitUntilBootReveal(options: {
  holdStartedAt: number
  sync: Promise<unknown>
  isOffline: () => boolean
  now?: () => number
  sleep?: Sleep
  minHoldMs?: number
  capMs?: number
}): Promise<'sync' | 'offline' | 'timeout'> {
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep
  const minHoldMs = options.minHoldMs ?? PROPELLER_CYCLE_MS
  const capMs = options.capMs ?? FULL_SYNC_HOLD_CAP_MS
  let syncDone = false
  const syncSettled = options.sync.then(
    () => { syncDone = true },
    () => { syncDone = true },
  )

  for (;;) {
    await Promise.resolve()
    const t = now()
    const offline = options.isOffline()
    if (shouldRevealDashboard({
      holdStartedAt: options.holdStartedAt,
      now: t,
      syncDone,
      offline,
      minHoldMs,
      capMs,
    })) {
      if (syncDone) return 'sync'
      if (offline) return 'offline'
      return 'timeout'
    }

    const elapsed = t - options.holdStartedAt
    const cycleLeft = minHoldMs - elapsed
    const capLeft = capMs - elapsed
    if (syncDone || offline) {
      await sleep(Math.max(1, cycleLeft))
    } else if (cycleLeft > 0) {
      await Promise.race([sleep(cycleLeft), syncSettled])
    } else {
      await Promise.race([sleep(Math.max(1, capLeft)), syncSettled])
    }
  }
}

/**
 * Signed-out cold open on Capacitor keeps the propeller for one cycle, counted
 * from process start. The website drops the splash as soon as the shell is up.
 */
export function signedOutColdOpenDelayMs(input: {
  native: boolean
  now: number
  coldBootStartedAt: number
  minHoldMs?: number
}): number {
  if (!input.native) return 0
  const minHoldMs = input.minHoldMs ?? PROPELLER_CYCLE_MS
  return Math.max(0, minHoldMs - (input.now - input.coldBootStartedAt))
}

/**
 * Progressive full sync returns after the first page. That page is not the
 * logbook, so a boot hold must keep waiting for the rest.
 */
export function bootHoldNeedsRemainingSync(input: {
  firstBatchCount: number
  pageSize: number
}): boolean {
  return input.pageSize > 0 && input.firstBatchCount >= input.pageSize
}

const SIGN_IN_HOLD_KEY = 'logifi.signInBootHold'
const SIGN_IN_HOLD_MAX_AGE_MS = 30_000

/** Remember a fresh sign-in so a document reload still waits for the full sync. */
export function markSignInBootHold(now = Date.now()): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(SIGN_IN_HOLD_KEY, String(now))
  } catch {
    // Storage can throw in private mode. The in-page hold still runs.
  }
}

/** True once, and only for a sign-in in the last 30s. Resume does not set this. */
export function consumeSignInBootHold(now = Date.now()): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(SIGN_IN_HOLD_KEY)
    if (!raw) return false
    sessionStorage.removeItem(SIGN_IN_HOLD_KEY)
    const started = Number(raw)
    if (!Number.isFinite(started)) return false
    return now - started >= 0 && now - started < SIGN_IN_HOLD_MAX_AGE_MS
  } catch {
    return false
  }
}

/**
 * Last-resort splash removal. Dashboard and Capacitor match the hold cap.
 * Marketing pages on the website stay at 6s.
 */
export function splashFallbackMs(path: string, native = false): number {
  if (native || isDashboardPath(path)) return PROPELLER_CYCLE_MS + FULL_SYNC_HOLD_CAP_MS
  return MARKETING_SPLASH_FALLBACK_MS
}
