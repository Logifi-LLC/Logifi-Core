import { describe, expect, it } from 'vitest'
import {
  MARK_BL_PIVOT,
  MARK_CENTER,
  MARK_MERGE_BL,
  MARK_MERGE_TR,
  MARK_TR_PIVOT,
  MARK_VIEWBOX,
  WORDMARK_BL_TO_ICON,
  WORDMARK_ICON_BL,
  WORDMARK_LOCKUP_BL,
} from '../loadingAnimationMarkGeometry'

describe('loadingAnimationMarkGeometry', () => {
  it('uses favicon aspect viewBox 186×210', () => {
    expect(MARK_VIEWBOX).toEqual({ width: 186, height: 210 })
  })

  it('merges corners exactly on the center pivot', () => {
    expect(MARK_MERGE_BL.x + MARK_BL_PIVOT.x).toBe(MARK_CENTER.x)
    expect(MARK_MERGE_BL.y + MARK_BL_PIVOT.y).toBe(MARK_CENTER.y)
    expect(MARK_MERGE_TR.x + MARK_TR_PIVOT.x).toBe(MARK_CENTER.x)
    expect(MARK_MERGE_TR.y + MARK_TR_PIVOT.y).toBe(MARK_CENTER.y)
  })

  it('maps wordmark lockup brackets to the centered icon mark', () => {
    expect(WORDMARK_LOCKUP_BL.x + WORDMARK_BL_TO_ICON.x).toBe(WORDMARK_ICON_BL.x)
    expect(WORDMARK_LOCKUP_BL.y + WORDMARK_BL_TO_ICON.y).toBe(WORDMARK_ICON_BL.y)
  })
})