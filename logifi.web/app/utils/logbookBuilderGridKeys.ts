import type { LogbookColumnKey } from '~/utils/logbookTypes'

export type DeferGridKeydownOptions = {
  fieldKey: LogbookColumnKey | null
  key: string
  isSelectFocused: boolean
  pilotMenuOpen: boolean
  pilotHighlightIndex: number
}

/** Tags editor lives inside the grid; keyboard nav must leave it alone. */
export function isBuilderTagEditorTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-builder-row-tags]') != null
}

/** When true, the grid should not intercept the key — let the cell control handle it. */
export function shouldDeferGridKeydown(options: DeferGridKeydownOptions): boolean {
  const { fieldKey, key, isSelectFocused, pilotMenuOpen, pilotHighlightIndex } = options

  if (isSelectFocused && (key === 'ArrowUp' || key === 'ArrowDown')) {
    return true
  }

  if ((fieldKey === 'pilots' || fieldKey === 'pilotRole') && pilotMenuOpen) {
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
