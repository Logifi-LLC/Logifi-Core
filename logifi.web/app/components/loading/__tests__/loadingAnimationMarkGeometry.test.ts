import { describe, expect, it } from 'vitest'
import {
  MARK_BL_ORIGIN,
  MARK_BL_PIVOT,
  MARK_CENTER,
  MARK_MERGE_BL,
  MARK_MERGE_TR,
  MARK_TR_ORIGIN,
  MARK_TR_PIVOT,
  MARK_VIEWBOX,
  OFFICIAL_MARK_CENTER,
  OFFICIAL_MARK_MERGE_BL,
  OFFICIAL_MARK_MERGE_TR,
  OFFICIAL_MARK_VIEWBOX,
  WORDMARK_BL_TO_ICON,
  WORDMARK_ICON_BL,
  WORDMARK_ICON_TR,
  WORDMARK_LOCKUP_BL,
  WORDMARK_LOCKUP_TR,
  WORDMARK_TR_TO_ICON,
} from '../loadingAnimationMarkGeometry'

describe('loadingAnimationMarkGeometry', () => {
  it('uses the official 512 mark and centers both bars on the cross', () => {
    expect(OFFICIAL_MARK_VIEWBOX).toEqual({ width: 512, height: 512 })
    expect(OFFICIAL_MARK_MERGE_BL).toEqual({ x: 127, y: -146.25 })
    expect(OFFICIAL_MARK_MERGE_TR).toEqual({ x: -128.5, y: 145 })
    expect((116 + 142) / 2 + OFFICIAL_MARK_MERGE_BL.x).toBe(OFFICIAL_MARK_CENTER.x)
    expect((389.5 + 415) / 2 + OFFICIAL_MARK_MERGE_BL.y).toBe(OFFICIAL_MARK_CENTER.y)
    expect((372 + 397) / 2 + OFFICIAL_MARK_MERGE_TR.x).toBe(OFFICIAL_MARK_CENTER.x)
    expect((98 + 124) / 2 + OFFICIAL_MARK_MERGE_TR.y).toBe(OFFICIAL_MARK_CENTER.y)
  })

  it('uses favicon aspect viewBox 186×210', () => {
    expect(MARK_VIEWBOX).toEqual({ width: 186, height: 210 })
  })

  it('merges corners exactly on the center pivot', () => {
    expect(MARK_MERGE_BL).toEqual({ x: 54, y: -85 })
    expect(MARK_MERGE_TR).toEqual({ x: -68, y: 86 })
    expect(MARK_MERGE_BL.x + MARK_BL_PIVOT.x).toBe(MARK_CENTER.x)
    expect(MARK_MERGE_TR.x + MARK_TR_PIVOT.x).toBe(MARK_CENTER.x)
    expect(MARK_MERGE_BL.y + MARK_BL_PIVOT.y + 5).toBe(MARK_CENTER.y)
    expect(MARK_MERGE_TR.y + MARK_TR_PIVOT.y - 5).toBe(MARK_CENTER.y)
  })

  it('places fill-box origins on the inner vertices', () => {
    expect(MARK_BL_ORIGIN).toEqual({ x: 39, y: 112 })
    expect(MARK_TR_ORIGIN).toEqual({ x: 111, y: 10 })
  })

  it('maps wordmark lockup brackets to the centered icon mark', () => {
    expect(WORDMARK_LOCKUP_BL).toEqual({ x: 85, y: 251 })
    expect(WORDMARK_LOCKUP_TR).toEqual({ x: 316, y: 133 })
    expect(WORDMARK_BL_TO_ICON).toEqual({ x: 61, y: 29 })
    expect(WORDMARK_TR_TO_ICON).toEqual({ x: -48, y: -14 })
    expect(WORDMARK_LOCKUP_BL.x + WORDMARK_BL_TO_ICON.x).toBe(WORDMARK_ICON_BL.x)
    expect(WORDMARK_LOCKUP_BL.y + WORDMARK_BL_TO_ICON.y).toBe(WORDMARK_ICON_BL.y)
    expect(WORDMARK_LOCKUP_TR.x + WORDMARK_TR_TO_ICON.x).toBe(WORDMARK_ICON_TR.x)
    expect(WORDMARK_LOCKUP_TR.y + WORDMARK_TR_TO_ICON.y).toBe(WORDMARK_ICON_TR.y)
  })
})