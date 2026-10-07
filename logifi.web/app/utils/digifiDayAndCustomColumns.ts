import { parseImportDuration } from '../../shared/logbookDataBridge/formatters'
import type { BuilderColumnKind } from './logbookBuilderTypes'
import { DIGIFI_ROW_TIME_MISMATCH_TOLERANCE } from './digifiRowTimeMismatch'

/** Preset labels that already exist. Same set as + Tag on the logbook. */
const FIXED_USER_TAGS = new Set(['Checkride', 'Flight Review', 'IPC'])

const CHECK_MARKS = new Set(['✓', '✔', '√', '✅', '✕', '✖', '✗', '✘', '☑', '☒'])

export interface DayOrCustomColumn {
  id: string
  label: string
  order?: number
  columnKind?: BuilderColumnKind | null
}

export function isDayColumn(column: { columnKind?: BuilderColumnKind | null }): boolean {
  return column.columnKind === 'day'
}

export function isCustomColumn(column: { columnKind?: BuilderColumnKind | null; label?: string | null }): boolean {
  return column.columnKind === 'custom' && Boolean(column.label?.trim())
}

/** True when a custom-column cell should become that column's tag. 0 and blank do not. */
export function customColumnCellCountsAsTag(raw: string | null | undefined): boolean {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return false
  if (trimmed.toLowerCase() === 'x' || CHECK_MARKS.has(trimmed)) return true
  const parsed = parseImportDuration(trimmed)
  return parsed != null && parsed > 0
}

/** Tag titles for custom columns on one row, in column order. */
export function tagsForCustomColumns(
  columns: readonly DayOrCustomColumn[],
  cells: Record<string, string> | null | undefined
): string[] {
  if (!cells) return []
  const tags: string[] = []
  const seen = new Set<string>()
  const sorted = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const column of sorted) {
    if (!isCustomColumn(column)) continue
    if (!customColumnCellCountsAsTag(cells[column.id])) continue
    const title = column.label.trim()
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(title)
  }
  return tags
}

/** Manual row tags first, then custom-column tags. Case-insensitive, first spelling wins. */
export function mergeEntryTags(existing: readonly string[] | undefined, auto: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const tag of [...(existing ?? []), ...auto]) {
    const trimmed = tag.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

/** Distinct custom-column tags across rows, for creating user tag presets. */
export function customColumnTagsOnRows(
  columns: readonly DayOrCustomColumn[],
  rows: readonly { cells?: Record<string, string> | null }[]
): string[] {
  const tags: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const tag of tagsForCustomColumns(columns, row.cells)) {
      const key = tag.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      tags.push(tag)
    }
  }
  return tags
}

/** Names to insert into user_tag_presets. Skips the built-in + Tag presets. */
export function userTagPresetsToCreate(tags: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const tag of tags) {
    const trimmed = tag.trim()
    if (!trimmed || FIXED_USER_TAGS.has(trimmed)) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

/**
 * Night = Total − Day when the Night cell is blank.
 * Returns null when Day is missing, Total is missing, or Day is greater than Total
 * (a negative night is not stored).
 */
export function deriveNightFromDayAndTotal(
  dayRaw: string | null | undefined,
  total: number | null | undefined
): number | null {
  if (!String(dayRaw ?? '').trim()) return null
  const day = parseImportDuration(dayRaw)
  if (day == null || total == null || total < 0) return null
  if (day > total + DIGIFI_ROW_TIME_MISMATCH_TOLERANCE) return null
  const night = Math.round((total - day) * 10) / 10
  return night < 0 ? 0 : night
}
