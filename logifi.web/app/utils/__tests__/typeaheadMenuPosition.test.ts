import { describe, it, expect } from 'vitest'
import {
  TYPEAHEAD_MENU_MAX_HEIGHT,
  TYPEAHEAD_OPTION_HEIGHT,
  TYPEAHEAD_VISIBLE_OPTIONS,
  typeaheadClipPadding,
  typeaheadScrollDelta,
  typeaheadScrollRoomShortfall,
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

describe('typeaheadClipPadding', () => {
  it('adds nothing when the menu already fits in the card', () => {
    expect(typeaheadClipPadding(323, 550, TYPEAHEAD_MENU_MAX_HEIGHT)).toBe(0)
  })

  it('pads the card when the last row menu would be clipped', () => {
    expect(typeaheadClipPadding(754, 754, TYPEAHEAD_MENU_MAX_HEIGHT)).toBe(TYPEAHEAD_MENU_MAX_HEIGHT + 8)
  })
})

describe('typeaheadScrollRoomShortfall', () => {
  it('is zero when the page can already scroll the cell up', () => {
    expect(typeaheadScrollRoomShortfall(155, 1200, 844, 100)).toBe(0)
  })

  it('requests the missing padding when the last row is already fully scrolled', () => {
    expect(typeaheadScrollRoomShortfall(155, 998, 844, 154)).toBe(155)
  })
})
