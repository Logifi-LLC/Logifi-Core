import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { isDigifiManualOnlyField } from '~/utils/logbookBuilderTypes'
import type { DigifiPageSide, DigifiTemplateColumn } from '~/utils/digifiTypes'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

/** Page-scoped scan columns (matches server `buildTargetColumns`). */
export function buildDigifiTargetColumnsForPage(
  grid: Grid,
  pageSide: DigifiPageSide
): DigifiTemplateColumn[] {
  const sorted = [...grid.visibleColumns.value].sort((a, b) => a.order - b.order)
  const mapped: DigifiTemplateColumn[] = sorted
    .filter((c) => !isDigifiManualOnlyField(c.fieldKey))
    .map((c) => ({
      id: c.id,
      label: c.label,
      fieldKey: c.fieldKey,
      order: c.order,
      categoryClassValue: c.categoryClassValue,
    }))

  if (grid.layout.value !== 'two-page') return mapped

  const split = grid.effectiveSplitIndex.value
  if (pageSide === 'left') return mapped.slice(0, split)
  return mapped.slice(split)
}
