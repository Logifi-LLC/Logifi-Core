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
