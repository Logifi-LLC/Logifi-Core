import type { DigifiScanRow } from '../../app/utils/digifiTypes'

/** Strip optional markdown code fences some models still emit. */
export function stripGeminiTextFences(text: string): string {
  let trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) {
    trimmed = fenced[1].trim()
  }
  return trimmed
}

/**
 * Parse sparse cell lines: rowIndex<TAB>columnId<TAB>value
 * Empty lines and lines starting with # are ignored.
 */
export function parseDigifiTsvResponse(
  text: string,
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows?: Set<number>
): DigifiScanRow[] {
  const body = stripGeminiTextFences(text)
  const rowMap = new Map<number, DigifiScanRow>()

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const parts = line.split('\t')
    if (parts.length < 3) continue

    const rowIndex = Number.parseInt(parts[0], 10)
    if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= maxRowCount) continue
    if (focusRows && !focusRows.has(rowIndex)) continue

    const columnId = parts[1].trim()
    const value = parts.slice(2).join('\t').trim()
    if (!columnId || !allowedColumnIds.has(columnId) || !value) continue

    let row = rowMap.get(rowIndex)
    if (!row) {
      row = { rowIndex, cells: {} }
      rowMap.set(rowIndex, row)
    }
    if (!(row.cells[columnId] ?? '').trim()) {
      row.cells[columnId] = value
    }
  }

  return [...rowMap.values()].sort((a, b) => a.rowIndex - b.rowIndex)
}
