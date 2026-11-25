import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { normalizeDigifiCellDate } from '~/utils/digifiDateNormalize'
import type { DigifiSpreadYearState } from '~/utils/digifiSpreadYear'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

/** Re-apply spread year rules across the full grid (fixes per-page scan date context). */
export function renormalizeBuilderGridDates(grid: Grid): void {
  const dateCol = grid.visibleColumns.value.find((c) => c.fieldKey === 'date')
  if (!dateCol) return

  const defaultYear = grid.defaultYear.value
  let lastDateIso: string | null = null
  const spreadYear: DigifiSpreadYearState = { year: null }

  for (let rowIdx = 0; rowIdx < grid.rows.value.length; rowIdx++) {
    const raw = (grid.rows.value[rowIdx]?.cells?.[dateCol.id] ?? '').trim()
    if (!raw) continue
    const normalized = normalizeDigifiCellDate(raw, 'date', defaultYear, lastDateIso, spreadYear)
    if (normalized !== raw) {
      grid.setCell(rowIdx, dateCol.id, normalized)
    }
    if (normalized) lastDateIso = normalized
  }
}
