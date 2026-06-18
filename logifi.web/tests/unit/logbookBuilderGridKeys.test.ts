import { describe, it, expect } from 'vitest'
import { shouldDeferGridKeydown } from '../../app/utils/logbookBuilderGridKeys'

describe('shouldDeferGridKeydown', () => {
  it('defers ArrowDown when native select is focused', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'role',
        key: 'ArrowDown',
        isSelectFocused: true,
        pilotMenuOpen: false,
        pilotHighlightIndex: -1,
      }),
    ).toBe(true)
  })

  it('defers ArrowUp when native select is focused', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'approachType',
        key: 'ArrowUp',
        isSelectFocused: true,
        pilotMenuOpen: false,
        pilotHighlightIndex: -1,
      }),
    ).toBe(true)
  })

  it('does not defer Tab on select', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'role',
        key: 'Tab',
        isSelectFocused: true,
        pilotMenuOpen: false,
        pilotHighlightIndex: -1,
      }),
    ).toBe(false)
  })

  it('does not defer Enter on select', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'pilotRole',
        key: 'Enter',
        isSelectFocused: true,
        pilotMenuOpen: false,
        pilotHighlightIndex: -1,
      }),
    ).toBe(false)
  })

  it('defers arrow keys when pilot menu is open', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'pilots',
        key: 'ArrowDown',
        isSelectFocused: false,
        pilotMenuOpen: true,
        pilotHighlightIndex: 0,
      }),
    ).toBe(true)
  })

  it('defers Enter when pilot menu is open with a highlight', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'pilots',
        key: 'Enter',
        isSelectFocused: false,
        pilotMenuOpen: true,
        pilotHighlightIndex: 1,
      }),
    ).toBe(true)
  })

  it('defers Escape when pilot menu is open', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'pilots',
        key: 'Escape',
        isSelectFocused: false,
        pilotMenuOpen: true,
        pilotHighlightIndex: 0,
      }),
    ).toBe(true)
  })

  it('does not defer ArrowDown for plain text cells', () => {
    expect(
      shouldDeferGridKeydown({
        fieldKey: 'pic',
        key: 'ArrowDown',
        isSelectFocused: false,
        pilotMenuOpen: false,
        pilotHighlightIndex: -1,
      }),
    ).toBe(false)
  })
})
