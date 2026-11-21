import { beforeEach, describe, expect, it } from 'vitest'
import { PROPELLER_CYCLE_MS } from '../bootHold'
import { armSplashHoldUntil, htmlSplashMarkPainted, resetSplashHoldForTests, splashHoldRemainingMs, whenHtmlSplashMarkPainted } from '../appReady'

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

  it('waits to hide the launch image until the HTML propeller has a box', async () => {
    document.body.innerHTML = '<div id="app-splash"><svg class="boot-splash__propeller"></svg></div>'
    const mark = document.querySelector('.boot-splash__propeller') as SVGElement
    mark.getBoundingClientRect = () =>
      ({ width: 0, height: 0, x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON() { return {} } })
    expect(htmlSplashMarkPainted()).toBe(false)

    let frames = 0
    const real = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      frames += 1
      if (frames === 2) {
        mark.getBoundingClientRect = () =>
          ({ width: 72, height: 72, x: 159, y: 386, top: 386, left: 159, right: 231, bottom: 458, toJSON() { return {} } })
      }
      return real(() => cb(0))
    }
    try {
      const pending = whenHtmlSplashMarkPainted(1000)
      await pending
      expect(htmlSplashMarkPainted()).toBe(true)
      expect(frames).toBeGreaterThanOrEqual(3)
    } finally {
      globalThis.requestAnimationFrame = real
    }
  })
})
