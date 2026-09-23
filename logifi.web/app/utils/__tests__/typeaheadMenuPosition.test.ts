import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeTypeaheadMenuPosition } from '../typeaheadMenuPosition'

function mockAnchor(rect: DOMRect): HTMLElement {
  return {
    getBoundingClientRect: () => rect,
  } as HTMLElement
}

describe('computeTypeaheadMenuPosition', () => {
  const originalVv = window.visualViewport

  beforeEach(() => {
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('innerWidth', 390)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVv,
    })
  })

  function setVisualViewport(opts: {
    offsetTop: number
    offsetLeft: number
    height: number
    width: number
  }) {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        offsetTop: opts.offsetTop,
        offsetLeft: opts.offsetLeft,
        height: opts.height,
        width: opts.width,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    })
  }

  it('places menu just below the anchor when space allows', () => {
    setVisualViewport({ offsetTop: 0, offsetLeft: 0, height: 400, width: 390 })
    const anchor = mockAnchor(new DOMRect(10, 200, 100, 28))
    const pos = computeTypeaheadMenuPosition(anchor)
    expect(pos.placement).toBe('below')
    expect(pos.top).toBe(200 + 28 + 2)
  })

  it('accounts for visualViewport offset (iOS keyboard / scroll)', () => {
    setVisualViewport({ offsetTop: 320, offsetLeft: 0, height: 360, width: 390 })
    const anchor = mockAnchor(new DOMRect(12, 500, 120, 30))
    const pos = computeTypeaheadMenuPosition(anchor)
    expect(pos.placement).toBe('below')
    expect(pos.top).toBe(500 + 30 - 320 + 2)
    expect(pos.left).toBe(12)
  })

  it('does not clamp menu to offsetTop when anchor is in the visible band', () => {
    setVisualViewport({ offsetTop: 280, offsetLeft: 0, height: 340, width: 390 })
    const anchor = mockAnchor(new DOMRect(8, 420, 110, 28))
    const pos = computeTypeaheadMenuPosition(anchor)
    expect(pos.top).toBeGreaterThan(100)
    expect(pos.top).toBeLessThan(200)
  })
})
