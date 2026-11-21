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
 * Returning to the dashboard inside the same document must not replay the
 * propeller. A fresh sign-in still starts a hold, including after a reload.
 * A remount for a user already revealed in this document does not, even when
 * a stale sign-in flag is still in sessionStorage.
 */
export function shouldReplayBootHold(input: {
  alreadyRevealed: boolean
  signInHold: boolean
  sameUserAlreadyRevealed?: boolean
  /** This document already played the post-sign-in cycle for the user. */
  signInHoldAlreadyPlayed?: boolean
}): boolean {
  if (input.signInHold && !input.signInHoldAlreadyPlayed) return true
  if (input.sameUserAlreadyRevealed) return false
  if (input.signInHold) return false
  return !input.alreadyRevealed
}

const DOCUMENT_BOOT_KEY = '__logifiDocumentBootArmed'

/** True the first time in this document. In-app route changes do not reset it. */
export function armDocumentBootOnce(): boolean {
  if (typeof window === 'undefined') return true
  const host = window as Window & { [DOCUMENT_BOOT_KEY]?: boolean }
  if (host[DOCUMENT_BOOT_KEY]) return false
  host[DOCUMENT_BOOT_KEY] = true
  return true
}

export function resetDocumentBootForTests(): void {
  if (typeof window === 'undefined') return
  delete (window as Window & { [DOCUMENT_BOOT_KEY]?: boolean })[DOCUMENT_BOOT_KEY]
}

const DOCUMENT_DASHBOARD_BOOT_KEY = '__logifiDocumentDashboardBoot'

type DocumentDashboardBoot = {
  /** Signed-out sheet or a signed-in reveal already happened in this document. */
  revealed: boolean
  /** User whose logbook has been revealed and hydrated. Survives a remount. */
  hydratedUserId: string | null
  /** User whose onUserSessionReady hold is in flight. */
  holdUserId: string | null
  /** User onUserSessionReady has started for. The auth callback can beat the success event. */
  sessionReadyUserId: string | null
  /** User whose post-sign-in propeller cycle has started. A late success must not arm another. */
  signInHoldPlayedForUserId: string | null
}

type DashboardBootHost = Window & { [DOCUMENT_DASHBOARD_BOOT_KEY]?: DocumentDashboardBoot }

function emptyDocumentDashboardBoot(): DocumentDashboardBoot {
  return {
    revealed: false,
    hydratedUserId: null,
    holdUserId: null,
    sessionReadyUserId: null,
    signInHoldPlayedForUserId: null,
  }
}

function readDocumentDashboardBoot(): DocumentDashboardBoot {
  if (typeof window === 'undefined') return emptyDocumentDashboardBoot()
  return (window as DashboardBootHost)[DOCUMENT_DASHBOARD_BOOT_KEY] ?? emptyDocumentDashboardBoot()
}

function writeDocumentDashboardBoot(state: DocumentDashboardBoot): void {
  if (typeof window === 'undefined') return
  ;(window as DashboardBootHost)[DOCUMENT_DASHBOARD_BOOT_KEY] = state
}

/** True after the signed-out sheet or a signed-in reveal in this document. */
export function isDocumentBootRevealed(): boolean {
  return readDocumentDashboardBoot().revealed
}

/** The signed-out propeller has finished. A later sign-in can still start a hold. */
export function noteDocumentBootRevealed(): void {
  const state = readDocumentDashboardBoot()
  state.revealed = true
  writeDocumentDashboardBoot(state)
}

export function dashboardHydratedForUser(userId: string | null | undefined): boolean {
  if (!userId) return false
  return readDocumentDashboardBoot().hydratedUserId === userId
}

/**
 * onUserSessionReady is starting a hold for this user. A late sign-in success
 * must not arm another one, and this user is not hydrated again until it finishes.
 */
export function noteDashboardSessionReady(userId: string): void {
  const state = readDocumentDashboardBoot()
  state.sessionReadyUserId = userId
  writeDocumentDashboardBoot(state)
}

export function dashboardSessionReadyStartedFor(userId: string | null | undefined): boolean {
  if (!userId) return false
  return readDocumentDashboardBoot().sessionReadyUserId === userId
}

export function noteSignInHoldPlayed(userId: string): void {
  const state = readDocumentDashboardBoot()
  state.signInHoldPlayedForUserId = userId
  writeDocumentDashboardBoot(state)
}

export function signInHoldPlayedFor(userId: string | null | undefined): boolean {
  if (!userId) return false
  return readDocumentDashboardBoot().signInHoldPlayedForUserId === userId
}

export function noteDashboardHoldStarted(userId: string): void {
  const state = readDocumentDashboardBoot()
  state.holdUserId = userId
  if (state.hydratedUserId === userId) state.hydratedUserId = null
  writeDocumentDashboardBoot(state)
  clearRetainedDashboardLogbook()
}

/** The hold finished and this user's logbook can show without the propeller. */
export function noteDashboardHoldFinished(userId: string): void {
  const state = readDocumentDashboardBoot()
  if (state.holdUserId && state.holdUserId !== userId) return
  state.holdUserId = null
  state.hydratedUserId = userId
  state.revealed = true
  writeDocumentDashboardBoot(state)
}

/**
 * Sign-out drops the hydrated user so the next sign-in plays the propeller.
 * The document stays revealed, so the signed-out sheet does not replay it.
 */
export function noteSignedOutBootRevealed(): void {
  const state = readDocumentDashboardBoot()
  state.revealed = true
  state.holdUserId = null
  state.hydratedUserId = null
  state.sessionReadyUserId = null
  state.signInHoldPlayedForUserId = null
  writeDocumentDashboardBoot(state)
  clearRetainedDashboardLogbook()
}

/** Same-user remount keeps the gate open. A new user or a fresh hold closes it. */
export function shouldResetHydrationGate(userId: string | null | undefined): boolean {
  return !dashboardHydratedForUser(userId)
}

/**
 * AuthModal success must not re-arm a hold that onUserSessionReady already
 * owns or has already cleared for this user. That late write never gets a
 * matching clear, so the propeller stays up.
 */
export function shouldArmHoldOnSignInSuccess(userId: string | null | undefined): boolean {
  const state = readDocumentDashboardBoot()
  if (userId && state.holdUserId === userId) return false
  if (userId && state.signInHoldPlayedForUserId === userId) return false
  if (!userId && (state.holdUserId || state.signInHoldPlayedForUserId)) return false
  return true
}

export type SignInBootFlags = {
  bootHoldActive: boolean
  bootCurrencyPending: boolean
  logbookInboundSyncPending: boolean
}

/**
 * Flags for the auth success handler. The session-ready path owns the inbound
 * gate: setting it here sticks after the hold clears, because nothing else
 * turns it back off. bootHoldActive covers the gap until that path starts.
 */
export function signInSuccessBootFlags(
  input: SignInBootFlags & { userId: string | null | undefined },
): SignInBootFlags & { markSignInHold: boolean } {
  if (!shouldArmHoldOnSignInSuccess(input.userId)) {
    return {
      bootHoldActive: input.bootHoldActive,
      bootCurrencyPending: input.bootCurrencyPending,
      logbookInboundSyncPending: input.logbookInboundSyncPending,
      markSignInHold: false,
    }
  }
  return {
    bootHoldActive: true,
    bootCurrencyPending: true,
    logbookInboundSyncPending: input.logbookInboundSyncPending,
    markSignInHold: true,
  }
}

export function shouldShowBootLoader(input: {
  bootHoldActive: boolean
  authLoading: boolean
  authenticated: boolean
  hydrated: boolean
  sameUserAlreadyRevealed: boolean
}): boolean {
  if (input.bootHoldActive) return true
  if (input.sameUserAlreadyRevealed) return false
  if (!input.authLoading && !input.authenticated) return false
  return !input.hydrated
}

type RetainedLogbook = {
  userId: string
  entries: unknown[]
}

/** In-memory list for a remount in this document. A reload drops it. */
let retainedLogbook: RetainedLogbook | null = null

export function retainDashboardLogbook(userId: string, entries: readonly unknown[]): void {
  retainedLogbook = { userId, entries: entries.slice() }
}

export function takeRetainedDashboardLogbook(userId: string): unknown[] | null {
  if (!retainedLogbook || retainedLogbook.userId !== userId) return null
  return retainedLogbook.entries
}

export function clearRetainedDashboardLogbook(): void {
  retainedLogbook = null
}

export function resetDocumentDashboardBootForTests(): void {
  clearRetainedDashboardLogbook()
  if (typeof window === 'undefined') return
  delete (window as DashboardBootHost)[DOCUMENT_DASHBOARD_BOOT_KEY]
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
