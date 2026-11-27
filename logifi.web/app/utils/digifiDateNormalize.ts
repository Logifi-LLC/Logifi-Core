import type { LogbookColumnKey } from '~/utils/logbookTypes'
import {
  formatDigifiIsoDate,
  parseDigifiIsoDateParts,
  resolveDigifiSpreadYear,
  type DigifiSpreadYearState,
} from '~/utils/digifiSpreadYear'

/**
 * Normalize date string to YYYY-MM-DD (locked defaultYear + spread rollover).
 * Pass one `yearState` per page so a Dec→Jan rollover carries to the following rows.
 */
export function normalizeDigifiDateCell(
  dateStr: string,
  defaultYear: number | null | undefined,
  lastDateIso: string | null,
  yearState?: DigifiSpreadYearState
): string {
  const s = (dateStr || '').trim()
  if (!s) return ''
  const lockedYear =
    typeof defaultYear === 'number' && Number.isFinite(defaultYear) ? defaultYear : null
  const year = lockedYear ?? new Date().getFullYear()
  const resolveYear = (m: number, d: number, baseYear: number): number => {
    const y = resolveDigifiSpreadYear(m, d, baseYear, lastDateIso, yearState?.year)
    if (yearState) yearState.year = y
    return y
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const parts = parseDigifiIsoDateParts(s)
    if (!parts) return s
    if (lockedYear != null) {
      return formatDigifiIsoDate(resolveYear(parts.m, parts.d, lockedYear), parts.m, parts.d)
    }
    return s
  }

  const slashParts = s.split(/[/-]/).map((p) => p.trim())
  if (slashParts.length === 2) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return formatDigifiIsoDate(resolveYear(m, d, year), m, d)
    }
  }
  if (slashParts.length === 3) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    const yRaw = slashParts[2]
    const parsedY = parseInt(yRaw, 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      if (lockedYear != null) {
        return formatDigifiIsoDate(resolveYear(m, d, lockedYear), m, d)
      }
      let y: number
      if (!Number.isFinite(parsedY)) {
        y = year
      } else if (yRaw.length === 2) {
        const currentCentury = Math.floor(year / 100) * 100
        const candidate = currentCentury + parsedY
        if (candidate > year + 50) {
          y = currentCentury - 100 + parsedY
        } else {
          y = candidate
        }
      } else if (parsedY >= 1000) {
        y = parsedY
      } else {
        y = year
      }
      return formatDigifiIsoDate(y, m, d)
    }
  }
  return s
}

export function normalizeDigifiCellDate(
  value: string,
  fieldKey: LogbookColumnKey | null | undefined,
  defaultYear: number | null | undefined,
  lastDateIso: string | null,
  yearState?: DigifiSpreadYearState
): string {
  if (fieldKey !== 'date') return value
  return normalizeDigifiDateCell(value, defaultYear, lastDateIso, yearState)
}
