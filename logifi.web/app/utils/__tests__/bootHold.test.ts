import { beforeEach, describe, expect, it } from 'vitest'
import {
  FULL_SYNC_HOLD_CAP_MS,
  MARKETING_SPLASH_FALLBACK_MS,
  PROPELLER_CYCLE_MS,
  armDocumentBootOnce,
  bootHoldNeedsRemainingSync,
  bootHoldStartedAt,
  consumeSignInBootHold,
  dashboardHydratedForUser,
  getColdBootStartedAt,
  isDocumentBootRevealed,
  markColdBootStart,
  markSignInBootHold,
  noteDashboardHoldFinished,
  noteDashboardHoldStarted,
  noteDashboardSessionReady,
  noteDocumentBootRevealed,
  noteSignInHoldPlayed,
  noteSignedOutBootRevealed,
  resetDocumentBootForTests,
  resetDocumentDashboardBootForTests,
  retainDashboardLogbook,
  shouldReplayBootHold,
  shouldResetHydrationGate,
  shouldRevealDashboard,
  shouldShowBootLoader,
  shouldStartBootHold,
  signInHoldPlayedFor,
  signInSuccessBootFlags,
  signedOutColdOpenDelayMs,
  splashFallbackMs,
  takeRetainedDashboardLogbook,
  waitUntilBootReveal,
} from '../bootHold'

describe('boot hold reasons', () => {
  it('plays on cold open and after sign-in', () => {
    expect(shouldStartBootHold('cold-open')).toBe(true)
    expect(shouldStartBootHold('sign-in')).toBe(true)
  })

  it('does not replay when the app resumes from background', () => {
    expect(shouldStartBootHold('resume')).toBe(false)
    expect(bootHoldStartedAt({
      reason: 'resume',
      now: 10_000,
      coldBootStartedAt: 0,
    })).toBeNull()
  })

  it('counts a cold open from process start and a sign-in from now', () => {
    expect(bootHoldStartedAt({
      reason: 'cold-open',
      now: 5_000,
      coldBootStartedAt: 200,
    })).toBe(200)
    expect(bootHoldStartedAt({
      reason: 'sign-in',
      now: 5_000,
      coldBootStartedAt: 200,
    })).toBe(5_000)
  })
})

describe('shouldRevealDashboard', () => {
  const start = 1_000

  it('holds one full propeller cycle on a cold open even when sync is already done', () => {
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + PROPELLER_CYCLE_MS - 1,
      syncDone: true,
      offline: false,
    })).toBe(false)
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + PROPELLER_CYCLE_MS,
      syncDone: true,
      offline: false,
    })).toBe(true)
  })

  it('keeps the same minimum hold when motion is reduced', () => {
    // The predicate is time-only. Reduced motion keeps the static mark in CSS
    // and does not shorten this hold.
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + PROPELLER_CYCLE_MS - 1,
      syncDone: true,
      offline: false,
    })).toBe(false)
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + PROPELLER_CYCLE_MS,
      syncDone: true,
      offline: false,
    })).toBe(true)
  })

  it('after sign-in waits for the first full sync when that finishes later than the cycle', () => {
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + PROPELLER_CYCLE_MS,
      syncDone: false,
      offline: false,
    })).toBe(false)
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + 8_000,
      syncDone: true,
      offline: false,
    })).toBe(true)
  })

  it('reveals at the cap when sync has not finished', () => {
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + FULL_SYNC_HOLD_CAP_MS - 1,
      syncDone: false,
      offline: false,
    })).toBe(false)
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + FULL_SYNC_HOLD_CAP_MS,
      syncDone: false,
      offline: false,
    })).toBe(true)
  })

  it('falls back after one cycle when offline', () => {
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + PROPELLER_CYCLE_MS - 1,
      syncDone: false,
      offline: true,
    })).toBe(false)
    expect(shouldRevealDashboard({
      holdStartedAt: start,
      now: start + PROPELLER_CYCLE_MS,
      syncDone: false,
      offline: true,
    })).toBe(true)
  })
})

describe('waitUntilBootReveal', () => {
  it('holds the cycle when sync is already done', async () => {
    let t = 0
    const result = await waitUntilBootReveal({
      holdStartedAt: 0,
      sync: Promise.resolve(),
      isOffline: () => false,
      now: () => t,
      sleep: async (ms) => { t += ms },
    })
    expect(result).toBe('sync')
    expect(t).toBe(PROPELLER_CYCLE_MS)
  })

  it('waits for sync that finishes after the cycle', async () => {
    let t = 0
    let release: () => void = () => {}
    const sync = new Promise<void>((resolve) => { release = resolve })
    const result = await waitUntilBootReveal({
      holdStartedAt: 0,
      sync,
      isOffline: () => false,
      now: () => t,
      sleep: async (ms) => {
        if (t < 5_000 && t + ms > 5_000) {
          t = 5_000
          release()
          return
        }
        t += ms
      },
      minHoldMs: PROPELLER_CYCLE_MS,
      capMs: FULL_SYNC_HOLD_CAP_MS,
    })
    expect(result).toBe('sync')
    expect(t).toBe(5_000)
  })

  it('stops at the timeout when sync never finishes', async () => {
    let t = 0
    const result = await waitUntilBootReveal({
      holdStartedAt: 0,
      sync: new Promise(() => {}),
      isOffline: () => false,
      now: () => t,
      sleep: async (ms) => { t += ms },
    })
    expect(result).toBe('timeout')
    expect(t).toBe(FULL_SYNC_HOLD_CAP_MS)
  })

  it('shows cached data after one cycle when offline', async () => {
    let t = 0
    const result = await waitUntilBootReveal({
      holdStartedAt: 0,
      sync: new Promise(() => {}),
      isOffline: () => true,
      now: () => t,
      sleep: async (ms) => { t += ms },
    })
    expect(result).toBe('offline')
    expect(t).toBe(PROPELLER_CYCLE_MS)
  })
})

describe('signed-out cold open', () => {
  it('plays one propeller cycle on Capacitor and none on the website', () => {
    expect(signedOutColdOpenDelayMs({
      native: false,
      now: 0,
      coldBootStartedAt: 0,
    })).toBe(0)
    expect(signedOutColdOpenDelayMs({
      native: true,
      now: 400,
      coldBootStartedAt: 0,
    })).toBe(PROPELLER_CYCLE_MS - 400)
    expect(signedOutColdOpenDelayMs({
      native: true,
      now: PROPELLER_CYCLE_MS + 50,
      coldBootStartedAt: 0,
    })).toBe(0)
  })
})

describe('sign-in full sync', () => {
  it('does not treat the first full page as the finished logbook', () => {
    expect(bootHoldNeedsRemainingSync({ firstBatchCount: 100, pageSize: 100 })).toBe(true)
    expect(bootHoldNeedsRemainingSync({ firstBatchCount: 99, pageSize: 100 })).toBe(false)
    expect(bootHoldNeedsRemainingSync({ firstBatchCount: 0, pageSize: 100 })).toBe(false)
  })

  it('keeps a sign-in hold across one reload and does not replay it later', () => {
    sessionStorage.clear()
    markSignInBootHold(1_000)
    expect(consumeSignInBootHold(2_000)).toBe(true)
    expect(consumeSignInBootHold(2_100)).toBe(false)
    expect(shouldStartBootHold('resume')).toBe(false)
  })

  it('drops a sign-in hold that is older than the reload window', () => {
    sessionStorage.clear()
    markSignInBootHold(0)
    expect(consumeSignInBootHold(30_000)).toBe(false)
  })
})

describe('in-app return', () => {
  beforeEach(() => {
    resetDocumentBootForTests()
  })

  it('does not replay the propeller after the dashboard has already revealed', () => {
    expect(shouldReplayBootHold({ alreadyRevealed: true, signInHold: false })).toBe(false)
    expect(shouldReplayBootHold({ alreadyRevealed: false, signInHold: false })).toBe(true)
    expect(shouldReplayBootHold({ alreadyRevealed: true, signInHold: true })).toBe(true)
  })

  it('arms the document splash once', () => {
    expect(armDocumentBootOnce()).toBe(true)
    expect(armDocumentBootOnce()).toBe(false)
  })
})

describe('sign-in success after the hold', () => {
  beforeEach(() => {
    sessionStorage.clear()
    resetDocumentDashboardBootForTests()
  })

  function loaderUp(input: {
    bootHoldActive: boolean
    inboundSyncPending: boolean
    userId: string
  }): boolean {
    return shouldShowBootLoader({
      bootHoldActive: input.bootHoldActive,
      authLoading: false,
      authenticated: true,
      hydrated: !input.inboundSyncPending,
      sameUserAlreadyRevealed: dashboardHydratedForUser(input.userId),
    })
  }

  it('leaves the loader down when success is emitted after the hold resolved', () => {
    markSignInBootHold(1_000)
    expect(consumeSignInBootHold(1_100)).toBe(true)
    noteSignInHoldPlayed('pilot-1')
    noteDashboardHoldStarted('pilot-1')

    let flags = {
      bootHoldActive: true,
      bootCurrencyPending: true,
      logbookInboundSyncPending: false,
    }
    noteDashboardHoldFinished('pilot-1')
    flags = {
      bootHoldActive: false,
      bootCurrencyPending: false,
      logbookInboundSyncPending: false,
    }

    const late = signInSuccessBootFlags({ userId: 'pilot-1', ...flags })
    expect(late.markSignInHold).toBe(false)
    expect(late.bootHoldActive).toBe(false)
    expect(late.bootCurrencyPending).toBe(false)
    expect(late.logbookInboundSyncPending).toBe(false)
    expect(consumeSignInBootHold(2_000)).toBe(false)
    expect(loaderUp({
      bootHoldActive: late.bootHoldActive,
      inboundSyncPending: late.logbookInboundSyncPending,
      userId: 'pilot-1',
    })).toBe(false)
  })

  it('does not rewrite the sign-in flag while the hold is in progress', () => {
    markSignInBootHold(1_000)
    expect(consumeSignInBootHold(1_100)).toBe(true)
    noteDashboardHoldStarted('pilot-1')
    const during = signInSuccessBootFlags({
      userId: 'pilot-1',
      bootHoldActive: true,
      bootCurrencyPending: true,
      logbookInboundSyncPending: false,
    })
    expect(during.markSignInHold).toBe(false)
    expect(during.bootHoldActive).toBe(true)
    expect(consumeSignInBootHold(1_200)).toBe(false)
  })

  it('plays the cycle when the session watcher beat the success event', () => {
    noteDocumentBootRevealed()
    noteDashboardSessionReady('pilot-1')
    expect(shouldReplayBootHold({
      alreadyRevealed: true,
      signInHold: false,
      sameUserAlreadyRevealed: false,
      signInHoldAlreadyPlayed: false,
    })).toBe(false)
    noteDashboardHoldFinished('pilot-1')

    const lateStart = signInSuccessBootFlags({
      userId: 'pilot-1',
      bootHoldActive: false,
      bootCurrencyPending: false,
      logbookInboundSyncPending: false,
    })
    expect(lateStart.markSignInHold).toBe(true)
    expect(lateStart.bootHoldActive).toBe(true)
    expect(lateStart.logbookInboundSyncPending).toBe(false)
    if (lateStart.markSignInHold) markSignInBootHold(3_000)
    expect(consumeSignInBootHold(3_100)).toBe(true)
    expect(shouldReplayBootHold({
      alreadyRevealed: true,
      signInHold: true,
      sameUserAlreadyRevealed: dashboardHydratedForUser('pilot-1'),
      signInHoldAlreadyPlayed: signInHoldPlayedFor('pilot-1'),
    })).toBe(true)

    noteSignInHoldPlayed('pilot-1')
    noteDashboardHoldFinished('pilot-1')
    const after = signInSuccessBootFlags({
      userId: 'pilot-1',
      bootHoldActive: false,
      bootCurrencyPending: false,
      logbookInboundSyncPending: false,
    })
    expect(after.markSignInHold).toBe(false)
    expect(after.bootHoldActive).toBe(false)
    expect(loaderUp({
      bootHoldActive: after.bootHoldActive,
      inboundSyncPending: after.logbookInboundSyncPending,
      userId: 'pilot-1',
    })).toBe(false)
    expect(consumeSignInBootHold(3_200)).toBe(false)
  })

  it('arms when success arrives before the hold has started', () => {
    const armed = signInSuccessBootFlags({
      userId: 'pilot-1',
      bootHoldActive: false,
      bootCurrencyPending: false,
      logbookInboundSyncPending: false,
    })
    expect(armed.markSignInHold).toBe(true)
    expect(armed.bootHoldActive).toBe(true)
    expect(armed.logbookInboundSyncPending).toBe(false)
    if (armed.markSignInHold) markSignInBootHold(1_000)
    expect(consumeSignInBootHold(1_050)).toBe(true)
    noteDashboardHoldStarted('pilot-1')
    expect(shouldReplayBootHold({
      alreadyRevealed: isDocumentBootRevealed(),
      signInHold: true,
      sameUserAlreadyRevealed: false,
    })).toBe(true)
    noteDashboardHoldFinished('pilot-1')
    expect(loaderUp({
      bootHoldActive: false,
      inboundSyncPending: false,
      userId: 'pilot-1',
    })).toBe(false)
  })
})

describe('dashboard remount', () => {
  beforeEach(() => {
    sessionStorage.clear()
    resetDocumentDashboardBootForTests()
  })

  it('does not replay the hold or close the gate for a user already revealed', () => {
    noteSignInHoldPlayed('pilot-1')
    noteDashboardHoldFinished('pilot-1')
    retainDashboardLogbook('pilot-1', [{ id: 'flight-1' }])
    markSignInBootHold(1_000)

    expect(shouldReplayBootHold({
      alreadyRevealed: isDocumentBootRevealed(),
      signInHold: consumeSignInBootHold(1_100),
      sameUserAlreadyRevealed: dashboardHydratedForUser('pilot-1'),
      signInHoldAlreadyPlayed: signInHoldPlayedFor('pilot-1'),
    })).toBe(false)
    expect(shouldResetHydrationGate('pilot-1')).toBe(false)
    expect(shouldShowBootLoader({
      bootHoldActive: false,
      authLoading: false,
      authenticated: true,
      hydrated: false,
      sameUserAlreadyRevealed: true,
    })).toBe(false)
    expect(takeRetainedDashboardLogbook('pilot-1')).toEqual([{ id: 'flight-1' }])
  })

  it('still plays on a fresh sign-in after sign-out and on an account switch', () => {
    noteDashboardHoldFinished('pilot-1')
    noteSignedOutBootRevealed()
    expect(dashboardHydratedForUser('pilot-1')).toBe(false)
    expect(isDocumentBootRevealed()).toBe(true)
    expect(takeRetainedDashboardLogbook('pilot-1')).toBeNull()
    markSignInBootHold(5_000)
    expect(shouldReplayBootHold({
      alreadyRevealed: isDocumentBootRevealed(),
      signInHold: true,
      sameUserAlreadyRevealed: dashboardHydratedForUser('pilot-1'),
    })).toBe(true)

    noteDashboardHoldFinished('pilot-1')
    expect(shouldReplayBootHold({
      alreadyRevealed: true,
      signInHold: false,
      sameUserAlreadyRevealed: dashboardHydratedForUser('pilot-2'),
    })).toBe(false)
    expect(shouldResetHydrationGate('pilot-2')).toBe(true)
  })
})

describe('splash fallback', () => {
  it('does not add the propeller hold to marketing routes', () => {
    expect(splashFallbackMs('/')).toBe(MARKETING_SPLASH_FALLBACK_MS)
    expect(splashFallbackMs('/pricing')).toBe(MARKETING_SPLASH_FALLBACK_MS)
    expect(splashFallbackMs('/dashboard')).toBe(PROPELLER_CYCLE_MS + FULL_SYNC_HOLD_CAP_MS)
  })

  it('uses the dashboard cap on Capacitor even when the first path is /', () => {
    expect(splashFallbackMs('/', true)).toBe(PROPELLER_CYCLE_MS + FULL_SYNC_HOLD_CAP_MS)
  })

  it('records cold boot once', () => {
    markColdBootStart(100)
    markColdBootStart(999)
    expect(getColdBootStartedAt(5_000)).toBe(100)
  })
})
