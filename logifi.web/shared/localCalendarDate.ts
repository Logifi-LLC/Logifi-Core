/**
 * Calendar YYYY-MM-DD in the environment's local timezone (not UTC).
 * `Date#toISOString` is UTC and rolls the date overnight in the US.
 */
export function localCalendarYmd(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const MONTH_NAME_TO_NUM: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const dt = new Date(Date.UTC(year, month - 1, day))
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day
}

function formatYmd(year: number, month: number, day: number): string | null {
  if (!isValidYmd(year, month, day)) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Coerce a date-range bound to calendar YYYY-MM-DD.
 *
 * Autofi compares leg dates with string inequality. An ISO datetime from iOS/JSON
 * (`2026-08-29T00:00:00.000Z`) is lexicographically greater than every `YYYY-MM-DD`
 * on that same calendar day, so every parsed leg is counted as "outside your date range".
 * Use the date digits as written — do not convert UTC midnight to a local timezone.
 */
export function normalizeCalendarYmd(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null

  const isoPrefix = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoPrefix) {
    return formatYmd(
      parseInt(isoPrefix[1], 10),
      parseInt(isoPrefix[2], 10),
      parseInt(isoPrefix[3], 10)
    )
  }

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) {
    return formatYmd(parseInt(us[3], 10), parseInt(us[1], 10), parseInt(us[2], 10))
  }

  const named = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (named) {
    const month = MONTH_NAME_TO_NUM[named[1].toLowerCase()]
    if (!month) return null
    return formatYmd(parseInt(named[3], 10), month, parseInt(named[2], 10))
  }

  return null
}
