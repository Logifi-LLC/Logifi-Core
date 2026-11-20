import { describe, expect, it } from 'vitest'
import {
  FULL_SYNC_HOLD_CAP_MS,
  MARKETING_SPLASH_FALLBACK_MS,
  PROPELLER_CYCLE_MS,
  bootHoldNeedsRemainingSync,
  bootHoldStartedAt,
  consumeSignInBootHold,
  getColdBootStartedAt,
  markColdBootStart,
  markSignInBootHold,
  shouldRevealDashboard,
  shouldStartBootHold,
  signedOutColdOpenDelayMs,
  splashFallbackMs,
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
