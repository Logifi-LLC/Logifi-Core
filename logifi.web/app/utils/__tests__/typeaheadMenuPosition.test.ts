import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  computeTypeaheadMenuPosition,
  scrollTypeaheadAnchorIntoView,
} from '../typeaheadMenuPosition'

function mockAnchor(rect: DOMRect, scrollIntoView = vi.fn()): HTMLElement {
  return {
    getBoundingClientRect: () => rect,
    scrollIntoView,
  } as unknown as HTMLElement
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
    const pos = computeTypeaheadMenuPosition(anchor, 192, 2, {
      fixedTracksVisualViewport: true,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    expect(pos.placement).toBe('below')
    expect(pos.top).toBe(200 + 28 + 2)
  })

  it('keeps an iOS menu next to the cell when the keyboard sets offsetTop', () => {
    setVisualViewport({ offsetTop: 320, offsetLeft: 0, height: 360, width: 390 })
    const anchor = mockAnchor(new DOMRect(12, 160, 120, 30))
    const pos = computeTypeaheadMenuPosition(anchor, 192, 2, {
      fixedTracksVisualViewport: true,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    expect(pos.placement).toBe('below')
    expect(pos.top).toBe(160 + 30 + 2)
    expect(pos.left).toBe(12)
    expect(pos.top).toBeGreaterThan(50)
  })

  it('adds visualViewport offset when fixed positioning uses the layout viewport', () => {
    setVisualViewport({ offsetTop: 280, offsetLeft: 0, height: 340, width: 390 })
    const anchor = mockAnchor(new DOMRect(8, 120, 110, 28))
    const pos = computeTypeaheadMenuPosition(anchor, 192, 2, {
      fixedTracksVisualViewport: false,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    expect(pos.placement).toBe('below')
    expect(pos.top).toBe(120 + 28 + 280 + 2)
    expect(pos.left).toBe(8)
  })

  it('flips above the cell when the keyboard leaves no room below', () => {
    setVisualViewport({ offsetTop: 400, offsetLeft: 0, height: 380, width: 390 })
    const anchor = mockAnchor(new DOMRect(16, 340, 140, 28))
    const pos = computeTypeaheadMenuPosition(anchor, 192, 2, {
      fixedTracksVisualViewport: true,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    expect(pos.placement).toBe('above')
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(340)
    expect(pos.top).toBeGreaterThanOrEqual(4)
  })

  it('clamps the menu below the safe-area inset', () => {
    setVisualViewport({ offsetTop: 0, offsetLeft: 0, height: 400, width: 390 })
    const anchor = mockAnchor(new DOMRect(8, 10, 100, 20))
    const pos = computeTypeaheadMenuPosition(anchor, 192, 2, {
      fixedTracksVisualViewport: true,
      safeArea: { top: 59, right: 0, bottom: 0, left: 0 },
    })
    expect(pos.top).toBeGreaterThanOrEqual(59)
  })
})

describe('scrollTypeaheadAnchorIntoView', () => {
  const originalVv = window.visualViewport

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVv,
    })
  })

  it('does not scroll an anchor that is already in the visual viewport', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        offsetTop: 200,
        offsetLeft: 0,
        height: 400,
        width: 390,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    })
    const scrollIntoView = vi.fn()
    const anchor = mockAnchor(new DOMRect(10, 80, 100, 28), scrollIntoView)
    scrollTypeaheadAnchorIntoView(anchor)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
