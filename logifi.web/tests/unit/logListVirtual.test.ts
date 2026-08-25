import { describe, expect, it } from 'vitest'
import {
  getVirtualPadding,
  LOG_LIST_CARD_ESTIMATE_PX,
  LOG_LIST_OVERSCAN,
  LOG_LIST_TABLE_ROW_ESTIMATE_PX,
} from '../../app/utils/logListVirtual'

describe('logListVirtual', () => {
  it('uses table ~56px, card ~128px, and a positive overscan', () => {
    expect(LOG_LIST_TABLE_ROW_ESTIMATE_PX).toBe(56)
    expect(LOG_LIST_CARD_ESTIMATE_PX).toBe(128)
    expect(LOG_LIST_OVERSCAN).toBeGreaterThan(0)
  })

  it('returns zero padding when there are no virtual items', () => {
    expect(getVirtualPadding([], 1000)).toEqual({
      paddingTop: 0,
      paddingBottom: 0,
    })
  })

  it('computes top from the first start and bottom from remaining size', () => {
    expect(
      getVirtualPadding(
        [
          { start: 112, end: 168 },
          { start: 168, end: 224 },
        ],
        560
      )
    ).toEqual({ paddingTop: 112, paddingBottom: 336 })
  })

  it('subtracts window scrollMargin from the top spacer', () => {
    expect(
      getVirtualPadding([{ start: 400, end: 456 }], 560, 280)
    ).toEqual({ paddingTop: 120, paddingBottom: 104 })
  })

  it('does not return negative padding', () => {
    expect(getVirtualPadding([{ start: 10, end: 900 }], 800, 40)).toEqual({
      paddingTop: 0,
      paddingBottom: 0,
    })
  })
})
