import { describe, it, expect } from 'vitest'
import {
  TYPEAHEAD_MENU_MAX_HEIGHT,
  TYPEAHEAD_OPTION_HEIGHT,
  TYPEAHEAD_VISIBLE_OPTIONS,
  typeaheadScrollDelta,
} from '../typeaheadMenuPosition'

describe('typeaheadScrollDelta', () => {
  it('keeps the menu height to about five options', () => {
    expect(TYPEAHEAD_VISIBLE_OPTIONS).toBe(5)
    expect(TYPEAHEAD_MENU_MAX_HEIGHT).toBe(TYPEAHEAD_OPTION_HEIGHT * 5)
  })

  it('does not scroll when the menu already fits under the cell', () => {
    expect(
      typeaheadScrollDelta({
        anchorTop: 200,
        anchorBottom: 244,
        menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
        viewportHeight: 844,
      })
    ).toBe(0)
  })

  it('scrolls the cell up when the menu would run off the visual viewport', () => {
    const anchorTop = 279
    const anchorBottom = 323
    const viewportHeight = 420
    const delta = typeaheadScrollDelta({
      anchorTop,
      anchorBottom,
      menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      viewportHeight,
    })
    expect(delta).toBe(anchorBottom + TYPEAHEAD_MENU_MAX_HEIGHT - viewportHeight)
    expect(delta).toBeGreaterThan(0)
    expect(anchorTop - delta).toBeGreaterThanOrEqual(0)
  })

  it('does not scroll the cell under the safe area to make room', () => {
    const delta = typeaheadScrollDelta({
      anchorTop: 40,
      anchorBottom: 80,
      menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      viewportHeight: 200,
      safeTop: 8,
    })
    expect(delta).toBe(40 - 8)
  })
})
