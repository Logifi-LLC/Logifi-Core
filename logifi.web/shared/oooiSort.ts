import { DateTime } from 'luxon'
import { getAirportIanaTimezone } from './airportTimezone'

export interface OooiSortEntryShape {
  date: string
  departure: string
  oooi?: {
    out?: string | null
    isZulu?: boolean
  } | null
}

/** Parse 4-digit OOOI time (HHMM) to minutes since midnight. */
export function parseOOOITime(time: string | null | undefined): number | null {
  if (!time || time.length === 0) return null
  const digits = time.replace(/\D/g, '').padStart(4, '0')
  if (digits.length !== 4) return null
  const hours = parseInt(digits.slice(0, 2), 10)
  const minutes = parseInt(digits.slice(2, 4), 10)
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }
  return hours * 60 + minutes
}

function resolveLocalTimezone(departure: string): string {
  return (
    getAirportIanaTimezone(departure) ??
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null) ??
    'UTC'
  )
}

/**
 * UTC epoch millis for OOOI out time on the entry date, for chronological comparison.
 * Returns null when out time is missing or invalid.
 */
export function getOooiOutUtcMillis(entry: OooiSortEntryShape): number | null {
  const minutes = parseOOOITime(entry.oooi?.out ?? null)
  if (minutes === null || !entry.date) return null

  const isZulu = entry.oooi?.isZulu !== false

  if (isZulu) {
    const dt = DateTime.fromISO(entry.date, { zone: 'utc' }).startOf('day').plus({ minutes })
    if (!dt.isValid) return null
    return dt.toUTC().toMillis()
  }

  const zone = resolveLocalTimezone(entry.departure)
  const dt = DateTime.fromISO(entry.date, { zone }).startOf('day').plus({ minutes })
  if (!dt.isValid) return null
  return dt.toUTC().toMillis()
}

export function compareEntriesByDateAndOOOI<T extends OooiSortEntryShape>(a: T, b: T): number {
  const dateA = new Date(a.date).getTime()
  const dateB = new Date(b.date).getTime()
  const dateDiff = dateB - dateA
  if (dateDiff !== 0) return dateDiff

  const timeA = getOooiOutUtcMillis(a)
  const timeB = getOooiOutUtcMillis(b)

  if (timeA === null && timeB === null) return 0
  if (timeA === null) return 1
  if (timeB === null) return -1
  return timeB - timeA
}

export function sortEntriesByDateAndOOOI<T extends OooiSortEntryShape>(entries: T[]): T[] {
  return [...entries].sort(compareEntriesByDateAndOOOI)
}
