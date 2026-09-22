import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'

type Grid = ReturnType<typeof useLogbookBuilderGrid>

/** Collapse OCR double-spaces and normalize pipe separators (matches server normalizeRemarks). */
export function normalizeDigifiRemarksCell(value: string): string {
  return value
    .replace(/\\r\\n/g, ' | ')
    .replace(/\\n/g, ' | ')
    .replace(/\\r/g, ' | ')
    .replace(/\r?\n/g, ' | ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/(?: \| )+/g, ' | ')
    .trim()
}

export function remarksHasAbnormalWhitespace(value: string): boolean {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return false
  return /[ \t]{3,}/.test(trimmed) || /\t/.test(trimmed)
}

export function normalizeGridRemarksCells(grid: Grid): void {
  for (const column of grid.visibleColumns.value) {
    if (column.fieldKey !== 'remarks') continue
    for (let rowIdx = 0; rowIdx < grid.rows.value.length; rowIdx++) {
      const raw = grid.rows.value[rowIdx]?.cells?.[column.id] ?? ''
      if (!raw.trim()) continue
      const normalized = normalizeDigifiRemarksCell(raw)
      if (normalized !== raw) {
        grid.setCell(rowIdx, column.id, normalized)
      }
    }
  }
}
