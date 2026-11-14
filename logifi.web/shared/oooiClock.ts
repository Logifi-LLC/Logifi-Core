import { DateTime } from 'luxon'
import { getAirportIanaTimezone } from './airportTimezone'
import { parseOOOITime } from './oooiSort'

/** Naive local datetime from FC View / FLICA / FlightAware airport-local conversion. */
export const AIRLINE_LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/

export type OooiEventKey = 'out' | 'off' | 'on' | 'in'

export interface OooiClockFields {
  out?: string | null
  off?: string | null
  on?: string | null
  in?: string | null
  isZulu?: boolean
  tzUnresolved?: boolean
}

const MAX_FORWARD_GAP_MINUTES = 22 * 60

export function parseAirlineLocalDatetimeInZone(
  dt: string,
  zone: string
): DateTime | null {
  const m = dt.trim().match(AIRLINE_LOCAL_DATETIME_RE)
  if (!m) return null
  const dtObj = DateTime.fromObject(
    {
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      day: parseInt(m[3], 10),
      hour: parseInt(m[4], 10),
      minute: parseInt(m[5], 10),
      second: m[6] ? parseInt(m[6], 10) : 0,
    },
    { zone }
  )
  return dtObj.isValid ? dtObj : null
}

/** ISO-8601 with Z or numeric offset, or a naive datetime interpreted as UTC. */
export function parseAirlineUtcDatetime(dt: string): DateTime | null {
  const trimmed = dt.trim()
  if (!trimmed) return null
  const iso = DateTime.fromISO(trimmed, { zone: 'utc' })
  if (iso.isValid) return iso.toUTC()
  const naive = parseAirlineLocalDatetimeInZone(trimmed, 'utc')
  return naive ? naive.toUTC() : null
}

export function utcDateTimeToHhmm(dt: DateTime): string {
  return dt.toUTC().toFormat('HHmm')
}

export function localDatetimeToZuluHhmm(dt: string, zone: string): string | null {
  const parsed = parseAirlineLocalDatetimeInZone(dt, zone)
  if (!parsed) return null
  return utcDateTimeToHhmm(parsed)
}

export function utcDatetimeToZuluHhmm(dt: string): string | null {
  const parsed = parseAirlineUtcDatetime(dt)
  if (!parsed) return null
  return utcDateTimeToHhmm(parsed)
}

export function looksLikeUtcIso(dt: string): boolean {
  const t = dt.trim()
  return /[zZ]$/.test(t) || /[+-]\d{2}:?\d{2}$/.test(t)
}

export function zoneForOooiEvent(
  event: OooiEventKey,
  departure: string | null | undefined,
  destination: string | null | undefined,
  lookupTz: (code: string) => string | null = getAirportIanaTimezone
): string | null {
  const dep = (departure || '').trim()
  const arr = (destination || '').trim()
  if (event === 'out' || event === 'off') return dep ? lookupTz(dep) : null
  return (arr ? lookupTz(arr) : null) ?? (dep ? lookupTz(dep) : null)
}

export function oooiClockToUtc(
  dateYmd: string,
  hhmm: string,
  isZulu: boolean,
  zone: string | null
): DateTime | null {
  const minutes = parseOOOITime(hhmm)
  if (minutes === null || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const [yearS, monthS, dayS] = dateYmd.split('-')
  const year = parseInt(yearS, 10)
  const month = parseInt(monthS, 10)
  const day = parseInt(dayS, 10)
  if (isZulu || !zone) {
    const dt = DateTime.utc(year, month, day, hour, minute, 0)
    return dt.isValid ? dt : null
  }
  const dt = DateTime.fromObject(
    { year, month, day, hour, minute, second: 0 },
    { zone }
  )
  return dt.isValid ? dt : null
}

function wrapAfterPrevious(previous: DateTime, current: DateTime): DateTime {
  if (current.toMillis() >= previous.toMillis()) return current
  return current.plus({ days: 1 })
}

export interface OooiEventInstant {
  key: OooiEventKey
  label: string
  millis: number
}

/**
 * Convert present OOOI clocks to UTC instants.
 * Out/Off use departure zone; On/In use arrival zone when isZulu is false.
 * Each later event is wrapped +24h if it is still before the previous instant.
 * Returns null when a local event cannot be zoned (caller should not false-flag).
 */
export function oooiEventsToUtcInstants(opts: {
  date: string
  oooi: OooiClockFields
  departure?: string | null
  destination?: string | null
  lookupTz?: (code: string) => string | null
}): OooiEventInstant[] | null {
  const { date, oooi } = opts
  const lookupTz = opts.lookupTz ?? getAirportIanaTimezone
  const isZulu = oooi.isZulu === true
  const events: OooiEventInstant[] = []
  let previous: DateTime | null = null

  for (const key of ['out', 'off', 'on', 'in'] as const) {
    const raw = oooi[key]
    if (!raw || !String(raw).trim()) continue
    const zone = isZulu
      ? 'UTC'
      : zoneForOooiEvent(key, opts.departure, opts.destination, lookupTz)
    if (!isZulu && !zone) return null
    const instant = oooiClockToUtc(date, String(raw), isZulu, zone)
    if (!instant) return null
    const adjusted = previous ? wrapAfterPrevious(previous, instant) : instant
    events.push({
      key,
      label: key.toUpperCase(),
      millis: adjusted.toMillis(),
    })
    previous = adjusted
  }

  return events
}

export function oooiSequenceIsInOrder(
  events: OooiEventInstant[],
  maxForwardGapMinutes = MAX_FORWARD_GAP_MINUTES
): boolean {
  if (events.length < 2) return true
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]!
    const cur = events[i]!
    if (cur.millis >= prev.millis) continue
    return false
  }
  for (let i = 1; i < events.length; i++) {
    const gapMin = (events[i]!.millis - events[i - 1]!.millis) / 60000
    if (gapMin > maxForwardGapMinutes) return false
  }
  return true
}

function parseTimeToMinutes(time: string | null | undefined): number | null {
  return parseOOOITime(time ?? null)
}

function simpleDurationHours(start: string, end: string): number | null {
  const s = parseTimeToMinutes(start)
  const e = parseTimeToMinutes(end)
  if (s === null || e === null) return null
  let diff = e - s
  if (diff < 0) diff += 24 * 60
  return Math.round((diff / 60) * 10) / 10
}

/**
 * Gate/block hours between two OOOI clocks. Zulu (or missing zones) uses one
 * clock with midnight wrap. Local clocks use each airport's IANA zone.
 */
export function oooiPairDurationHours(opts: {
  start: string | null | undefined
  end: string | null | undefined
  date?: string | null
  isZulu?: boolean
  startTimezone?: string | null
  endTimezone?: string | null
}): number | null {
  const start = opts.start
  const end = opts.end
  if (!start || !end) return null

  const isZulu = opts.isZulu === true
  const startTimezone = opts.startTimezone ?? null
  const endTimezone = opts.endTimezone ?? null

  if (isZulu || (!startTimezone && !endTimezone) || startTimezone === endTimezone) {
    return simpleDurationHours(start, end)
  }

  const flightDate = opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date) ? opts.date : null
  if (!flightDate) return simpleDurationHours(start, end)

  const startDt = oooiClockToUtc(flightDate, start, false, startTimezone)
  const endDt = oooiClockToUtc(flightDate, end, false, endTimezone)
  if (!startDt || !endDt) return simpleDurationHours(start, end)

  let diffMin = endDt.toUTC().diff(startDt.toUTC(), 'minutes').minutes
  if (diffMin < 0) diffMin += 24 * 60
  if (diffMin <= 0 || diffMin > 24 * 60) return null
  return Math.round((diffMin / 60) * 10) / 10
}
