import type { LogbookColumnKey } from '~/utils/logbookTypes'

export type DeferGridKeydownOptions = {
  fieldKey: LogbookColumnKey | null
  key: string
  isSelectFocused: boolean
  pilotMenuOpen: boolean
  pilotHighlightIndex: number
}

/** When true, the grid should not intercept the key — let the cell control handle it. */
export function shouldDeferGridKeydown(options: DeferGridKeydownOptions): boolean {
  const { fieldKey, key, isSelectFocused, pilotMenuOpen, pilotHighlightIndex } = options

  if (isSelectFocused && (key === 'ArrowUp' || key === 'ArrowDown')) {
    return true
  }

  if (fieldKey === 'pilots' && pilotMenuOpen) {
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'Escape') {
      return true
    }
    if (
      key === 'Enter' &&
      pilotHighlightIndex >= 0
    ) {
      return true
    }
  }

  return false
}
