/**
 * When the logbook has too little history, currency math still runs but UI must not
 * show red "expired" chips — use neutral "Add more flights to track currency" instead.
 *
 * Insufficient when EITHER:
 * - Fewer than {@link MIN_FLIGHT_ENTRIES_FOR_CURRENCY_TRACKING} non-void flight entries, OR
 * - The earliest entry is newer than {@link CURRENCY_WINDOW_DAYS} calendar days ago (no full 90-day window yet).
 */

import { DateTime } from 'luxon'
import type { LogEntry } from './logbookTypes'

export const MIN_FLIGHT_ENTRIES_FOR_CURRENCY_TRACKING = 3
export const CURRENCY_WINDOW_DAYS = 90

export const CURRENCY_TRACKING_NEUTRAL_LABEL = 'Add more flights to track currency'

function isCountableFlightEntry(entry: LogEntry): boolean {
  if (entry.isVoid) return false
  if (entry.logbookType === 'simulator') return false
  const ft = entry.flightTime ?? {}
  const simTime = (ft.ffs ?? 0) + (ft.ftd ?? 0) + (ft.atd ?? 0)
  const airplaneTotal = Math.max(0, (ft.total ?? 0) - simTime)
  if (simTime > 0 && airplaneTotal === 0) return false
  return Boolean(entry.date?.trim())
}

export function countFlightEntriesForCurrency(entries: LogEntry[]): number {
  return entries.filter(isCountableFlightEntry).length
}

export function earliestFlightEntryDate(
  entries: LogEntry[],
  referenceDate: Date = new Date()
): Date | null {
  const ref = DateTime.fromJSDate(referenceDate)
  let earliest: DateTime | null = null
  for (const entry of entries) {
    if (!isCountableFlightEntry(entry)) continue
    const parsed = DateTime.fromISO(entry.date)
    if (!parsed.isValid) continue
    if (parsed > ref) continue
    if (!earliest || parsed < earliest) earliest = parsed
  }
  return earliest?.toJSDate() ?? null
}

/**
 * True when currency chips should use neutral tracking copy instead of expired/current chips.
 */
export function hasInsufficientCurrencyHistory(
  entries: LogEntry[],
  referenceDate: Date = new Date()
): boolean {
  const flightCount = countFlightEntriesForCurrency(entries)
  if (flightCount < MIN_FLIGHT_ENTRIES_FOR_CURRENCY_TRACKING) {
    return true
  }

  const earliest = earliestFlightEntryDate(entries, referenceDate)
  if (!earliest) return true

  const ref = DateTime.fromJSDate(referenceDate).startOf('day')
  const earliestDay = DateTime.fromJSDate(earliest).startOf('day')
  const daysOfHistory = ref.diff(earliestDay, 'days').days
  return daysOfHistory < CURRENCY_WINDOW_DAYS
}
