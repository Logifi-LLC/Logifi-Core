/**
 * 14 CFR Part 117 flight-time lookbacks (informational only).
 *
 * 117.23(b)(1) — may not schedule a flight crewmember for flight time unless the
 *   total flight time during any consecutive 672-hour period will not exceed 100 hours.
 * 117.23(b)(2) — may not assign to any reserve with a flight assignment unless the
 *   total flight time during any 365 consecutive calendar day period will not exceed
 *   1,000 hours.
 *
 * Duty / FDP / rest are out of scope. Block time is entry flightTime.total (Total).
 */

import { DateTime } from 'luxon'
import { getOooiOutUtcMillis } from '../../shared/oooiSort'
import { normalizeCalendarYmd } from '../../shared/localCalendarDate'
import { inferLogbookType } from './importSimulator'
import { filterEntriesForTotalsReport } from './totalsReport'
import type { LogEntry } from './logbookTypes'

/** 14 CFR 117.23(b)(1) */
export const FAR117_LIMIT_672_HOURS = 100
export const FAR117_WINDOW_672_HOURS = 672

/** 14 CFR 117.23(b)(2) */
export const FAR117_LIMIT_365_DAYS = 1000
export const FAR117_WINDOW_CALENDAR_DAYS = 365

export interface Far117LookbackRow {
  /** Hours summed toward the limit. */
  usedHours: number
  /** Non-negative hours until the cited limit. */
  remainingHours: number
  limitHours: number
  windowLabel: string
  /**
   * True when any entry in the 672-hour window lacked OOOI out time and was placed
   * by whole calendar day instead.
   */
  usedWholeDayApproximation?: boolean
}

export interface Far117FlightTimeLookbacks {
  asOfIso: string
  /** 117.23(b)(1) */
  consecutive672Hours: Far117LookbackRow
  /** 117.23(b)(2) */
  consecutive365CalendarDays: Far117LookbackRow
}

function blockTimeHours(entry: LogEntry): number {
  const total = entry.flightTime?.total
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) return 0
  return total
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10
}

export function filterEntriesForFar117(entries: readonly LogEntry[]): LogEntry[] {
  return filterEntriesForTotalsReport(entries).filter(
    (entry) => inferLogbookType(entry) !== 'simulator'
  )
}

function refDateTime(referenceDate?: Date): DateTime {
  return (referenceDate ? DateTime.fromJSDate(referenceDate) : DateTime.now()).toUTC()
}

/**
 * 672-hour window: include block time when OOOI out is inside [windowStart, ref],
 * otherwise include when the entry calendar day (UTC) overlaps the window.
 */
function entryCountsIn672Window(
  entry: LogEntry,
  windowStart: DateTime,
  ref: DateTime
): { include: boolean; approximated: boolean } {
  const outMillis = getOooiOutUtcMillis(entry)
  if (outMillis !== null) {
    const include = outMillis >= windowStart.toMillis() && outMillis <= ref.toMillis()
    return { include, approximated: false }
  }

  const ymd = normalizeCalendarYmd(entry.date)
  if (!ymd) return { include: false, approximated: false }

  const dayStart = DateTime.fromISO(ymd, { zone: 'utc' }).startOf('day')
  const dayEnd = dayStart.endOf('day')
  const include =
    dayEnd.toMillis() >= windowStart.toMillis() && dayStart.toMillis() <= ref.toMillis()
  return { include, approximated: include }
}

function entryCountsIn365CalendarDays(entry: LogEntry, startYmd: string, endYmd: string): boolean {
  const ymd = normalizeCalendarYmd(entry.date)
  if (!ymd) return false
  return ymd >= startYmd && ymd <= endYmd
}

export function calculateFar117FlightTimeLookbacks(
  entries: readonly LogEntry[],
  referenceDate?: Date
): Far117FlightTimeLookbacks {
  const ref = refDateTime(referenceDate)
  const eligible = filterEntriesForFar117(entries)

  const window672Start = ref.minus({ hours: FAR117_WINDOW_672_HOURS })
  let used672 = 0
  let approximated672 = false
  for (const entry of eligible) {
    const { include, approximated } = entryCountsIn672Window(entry, window672Start, ref)
    if (!include) continue
    used672 += blockTimeHours(entry)
    if (approximated) approximated672 = true
  }

  const endYmd = ref.toFormat('yyyy-MM-dd')
  const startYmd = ref.minus({ days: FAR117_WINDOW_CALENDAR_DAYS - 1 }).toFormat('yyyy-MM-dd')
  let used365 = 0
  for (const entry of eligible) {
    if (!entryCountsIn365CalendarDays(entry, startYmd, endYmd)) continue
    used365 += blockTimeHours(entry)
  }

  const used672Rounded = roundTenths(used672)
  const used365Rounded = roundTenths(used365)

  return {
    asOfIso: ref.toISO() ?? ref.toUTC().toISO() ?? new Date().toISOString(),
    consecutive672Hours: {
      usedHours: used672Rounded,
      remainingHours: roundTenths(Math.max(0, FAR117_LIMIT_672_HOURS - used672Rounded)),
      limitHours: FAR117_LIMIT_672_HOURS,
      windowLabel: 'Past 672 consecutive hours',
      usedWholeDayApproximation: approximated672,
    },
    consecutive365CalendarDays: {
      usedHours: used365Rounded,
      remainingHours: roundTenths(Math.max(0, FAR117_LIMIT_365_DAYS - used365Rounded)),
      limitHours: FAR117_LIMIT_365_DAYS,
      windowLabel: 'Past 365 consecutive calendar days',
    },
  }
}