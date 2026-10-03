import { describe, it, expect } from 'vitest'
import {
  TYPEAHEAD_MENU_MAX_HEIGHT,
  TYPEAHEAD_OPTION_HEIGHT,
  TYPEAHEAD_VISIBLE_OPTIONS,
  chooseTypeaheadPlacement,
} from '../typeaheadMenuPosition'

describe('chooseTypeaheadPlacement', () => {
  it('keeps the preferred menu height to about five options', () => {
    expect(TYPEAHEAD_VISIBLE_OPTIONS).toBe(5)
    expect(TYPEAHEAD_MENU_MAX_HEIGHT).toBe(TYPEAHEAD_OPTION_HEIGHT * 5)
  })

  it('opens downward when the menu fits under the cell', () => {
    expect(
      chooseTypeaheadPlacement({
        spaceAbove: 200,
        spaceBelow: 400,
        menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      })
    ).toEqual({ placement: 'down', maxHeight: TYPEAHEAD_MENU_MAX_HEIGHT })
  })

  it('opens upward when the last row, footer, or keyboard leaves no room below', () => {
    expect(
      chooseTypeaheadPlacement({
        spaceAbove: 420,
        spaceBelow: 0,
        menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      })
    ).toEqual({ placement: 'up', maxHeight: TYPEAHEAD_MENU_MAX_HEIGHT })
  })

  it('opens upward when only part of the menu would fit below', () => {
    expect(
      chooseTypeaheadPlacement({
        spaceAbove: 300,
        spaceBelow: 40,
        menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      })
    ).toEqual({ placement: 'up', maxHeight: TYPEAHEAD_MENU_MAX_HEIGHT })
  })

  it('caps the height to the larger side when neither side fits', () => {
    expect(
      chooseTypeaheadPlacement({
        spaceAbove: 100,
        spaceBelow: 48,
        menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      })
    ).toEqual({ placement: 'up', maxHeight: 100 })

    expect(
      chooseTypeaheadPlacement({
        spaceAbove: 36,
        spaceBelow: 90,
        menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      })
    ).toEqual({ placement: 'down', maxHeight: 90 })
  })

  it('prefers downward when both sides are equally short', () => {
    expect(
      chooseTypeaheadPlacement({
        spaceAbove: 80,
        spaceBelow: 80,
        menuHeight: TYPEAHEAD_MENU_MAX_HEIGHT,
      })
    ).toEqual({ placement: 'down', maxHeight: 80 })
  })
})
