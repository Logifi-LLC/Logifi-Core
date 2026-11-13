import type { LogbookColumnConfig, LogbookColumnKey } from './logbookTypes'

/** Table view with stacked cards at {@link STACKED_LOGBOOK_CARDS_MQ} and below. */
export const LOGBOOK_TABLE_CONDENSED_MQ = '(max-width: 1439px)'
export const LOGBOOK_TABLE_TIGHT_MQ = '(max-width: 1023px)'

export type LogbookTableDensity = 'full' | 'condensed' | 'tight'

const HIDDEN_BY_DENSITY: Record<LogbookTableDensity, Set<LogbookColumnKey>> = {
  full: new Set(),
  condensed: new Set(['conditions', 'remarks']),
  tight: new Set(['conditions', 'remarks', 'identification']),
}

export function resolveLogbookTableDensity(
  isCondensedViewport: boolean,
  isTightViewport: boolean
): LogbookTableDensity {
  if (isTightViewport) return 'tight'
  if (isCondensedViewport) return 'condensed'
  return 'full'
}

export function densityHideClass(
  columnKey: LogbookColumnKey,
  density: LogbookTableDensity
): string | undefined {
  if (!HIDDEN_BY_DENSITY[density].has(columnKey)) return undefined
  return 'hidden'
}

export function applyLogbookTableDensity(
  columns: LogbookColumnConfig[],
  density: LogbookTableDensity
): LogbookColumnConfig[] {
  return columns.map((col) => {
    const extra = densityHideClass(col.key, density)
    if (!extra) return col
    const existing = col.responsiveClass?.trim()
    const responsiveClass = existing ? `${existing} ${extra}` : extra
    return { ...col, responsiveClass }
  })
}
