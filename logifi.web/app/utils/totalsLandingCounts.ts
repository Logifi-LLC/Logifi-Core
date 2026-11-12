import type { LogEntry } from './logbookTypes'

export type TotalsDateRange = { start: Date | null; end: Date | null }

export interface LandingCountTotals {
  dayLandings: number
  nightLandings: number
  totalLandings: number
}

/** Sum day/night/total landing counts from log entries (missing performance fields = 0). */
export function sumLandingCountsFromEntries(
  entries: readonly Pick<LogEntry, 'date' | 'performance'>[]
): LandingCountTotals {
  let dayLandings = 0
  let nightLandings = 0
  for (const entry of entries) {
    dayLandings += entry.performance?.dayLandings ?? 0
    nightLandings += entry.performance?.nightLandings ?? 0
  }
  return {
    dayLandings,
    nightLandings,
    totalLandings: dayLandings + nightLandings,
  }
}

export function entryMatchesTotalsDateRange(
  entry: Pick<LogEntry, 'date'>,
  range: TotalsDateRange
): boolean {
  const d = new Date(entry.date)
  if (Number.isNaN(d.getTime())) return false
  if (range.start && d < range.start) return false
  if (range.end && d > range.end) return false
  return true
}

/** Filter entries to those inside the totals overview date window; null range keeps all. */
export function filterEntriesByTotalsDateRange<T extends Pick<LogEntry, 'date'>>(
  entries: readonly T[],
  range: TotalsDateRange | null
): T[] {
  if (!range) return [...entries]
  return entries.filter((entry) => entryMatchesTotalsDateRange(entry, range))
}

/**
 * Parse persisted totals metric keys from localStorage.
 * Drops unknown keys (forward/backward compat) instead of rejecting the whole list.
 */
export function normalizeSavedTotalsMetricKeys(
  parsed: unknown,
  validKeys: ReadonlySet<string>
): string[] | null {
  if (!Array.isArray(parsed)) return null
  const valid = parsed.filter((k): k is string => typeof k === 'string' && validKeys.has(k))
  if (valid.length === 0) return null
  const withoutTotal = valid.filter((k) => k !== 'totalTime')
  return ['totalTime', ...withoutTotal]
}
