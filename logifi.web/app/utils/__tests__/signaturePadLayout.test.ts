import { describe, expect, it } from 'vitest'
import { resolveSignaturePadCssSize } from '../signaturePadLayout'

describe('resolveSignaturePadCssSize', () => {
  it('uses the full frame height when fillParent is true', () => {
    expect(
      resolveSignaturePadCssSize({
        fillParent: true,
        frameWidth: 390,
        frameHeight: 520,
        fixedHeight: 160,
      })
    ).toEqual({ width: 390, height: 520 })
  })

  it('does not cap fillParent height to a landscape aspect ratio', () => {
    const tall = resolveSignaturePadCssSize({
      fillParent: true,
      frameWidth: 390,
      frameHeight: 700,
      fixedHeight: 160,
    })
    expect(tall?.height).toBe(700)
    expect(tall?.width).toBe(390)
  })

  it('returns null when the frame has no measurable area', () => {
    expect(
      resolveSignaturePadCssSize({
        fillParent: true,
        frameWidth: 0,
        frameHeight: 400,
        fixedHeight: 160,
      })
    ).toBeNull()
  })

  it('uses fixed height when fillParent is false', () => {
    expect(
      resolveSignaturePadCssSize({
        fillParent: false,
        frameWidth: 320,
        frameHeight: 999,
        fixedHeight: 160,
      })
    ).toEqual({ width: 320, height: 160 })
  })
})