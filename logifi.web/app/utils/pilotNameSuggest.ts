export type LabelValueOption = { value: string; label: string }

/** Filter label/value options (empty search returns all non-empty values). */
export function filterLabelValueSuggestions(
  options: readonly LabelValueOption[],
  search: string
): LabelValueOption[] {
  const q = search.trim().toLowerCase()
  const withValue = options.filter((o) => o.value !== '')
  if (!q) return [...withValue]
  return withValue.filter(
    (o) => o.value.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)
  )
}

/** Filter pilot name suggestions (empty search returns full list). */
export function filterPilotSuggestions(suggestions: string[], search: string): string[] {
  const q = search.trim().toLowerCase()
  if (!q) return suggestions
  return suggestions.filter((name) => name.toLowerCase().includes(q))
}

export type PilotSuggestKeydownResult =
  | { type: 'noop' }
  | { type: 'prevent'; highlightIndex: number }
  | { type: 'select'; value: string }
  | { type: 'close' }

/** Arrow / Enter / Escape handling for pilot name dropdowns. */
export function handlePilotSuggestKeydown(options: {
  key: string
  items: string[]
  highlightIndex: number
}): PilotSuggestKeydownResult {
  const { key, items, highlightIndex } = options
  if (items.length === 0) return { type: 'noop' }

  if (key === 'ArrowDown') {
    const next = highlightIndex < items.length - 1 ? highlightIndex + 1 : 0
    return { type: 'prevent', highlightIndex: next }
  }
  if (key === 'ArrowUp') {
    const next = highlightIndex > 0 ? highlightIndex - 1 : items.length - 1
    return { type: 'prevent', highlightIndex: next }
  }
  if (key === 'Enter' && highlightIndex >= 0 && highlightIndex < items.length) {
    const value = items[highlightIndex]
    if (value !== undefined) return { type: 'select', value }
  }
  if (key === 'Escape') {
    return { type: 'close' }
  }
  return { type: 'noop' }
}
