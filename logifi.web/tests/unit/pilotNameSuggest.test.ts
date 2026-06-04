import { describe, it, expect } from 'vitest'
import { filterPilotSuggestions, handlePilotSuggestKeydown } from '../../app/utils/pilotNameSuggest'

describe('pilotNameSuggest', () => {
  it('returns full list when search is empty', () => {
    expect(filterPilotSuggestions(['Alice', 'Bob'], '')).toEqual(['Alice', 'Bob'])
  })

  it('filters by substring', () => {
    expect(filterPilotSuggestions(['Alice', 'Bob'], 'al')).toEqual(['Alice'])
  })

  it('handles arrow and enter keys', () => {
    const down = handlePilotSuggestKeydown({
      key: 'ArrowDown',
      items: ['A', 'B'],
      highlightIndex: 0,
    })
    expect(down).toEqual({ type: 'prevent', highlightIndex: 1 })

    const enter = handlePilotSuggestKeydown({
      key: 'Enter',
      items: ['A', 'B'],
      highlightIndex: 1,
    })
    expect(enter).toEqual({ type: 'select', value: 'B' })
  })
})
