import { beforeEach, describe, expect, it } from 'vitest'
import { PROPELLER_CYCLE_MS } from '../bootHold'
import { armSplashHoldUntil, resetSplashHoldForTests, splashHoldRemainingMs } from '../appReady'

describe('capacitor splash hold', () => {
  beforeEach(() => {
    resetSplashHoldForTests()
  })

  it('keeps the HTML propeller up for one cycle from when it is armed', () => {
    const now = 10_000
    armSplashHoldUntil(now + PROPELLER_CYCLE_MS)
    expect(splashHoldRemainingMs(now)).toBe(PROPELLER_CYCLE_MS)
    expect(splashHoldRemainingMs(now + PROPELLER_CYCLE_MS - 1)).toBe(1)
    expect(splashHoldRemainingMs(now + PROPELLER_CYCLE_MS)).toBe(0)
  })

  it('does not shorten a hold that is already running', () => {
    const now = 20_000
    armSplashHoldUntil(now + PROPELLER_CYCLE_MS)
    armSplashHoldUntil(now + 500)
    expect(splashHoldRemainingMs(now)).toBe(PROPELLER_CYCLE_MS)
  })
})
