/**
 * Night time (FAR 1.1): end of evening civil twilight → beginning of morning
 * civil twilight at the aircraft's location.
 *
 * Night periods are [dusk on day D, dawn on day D+1]. They are NOT cut at
 * UTC midnight. Cutting at 00:00Z treated Pacific (and summer Eastern)
 * afternoon as night because local dusk there is after 00:00Z.
 *
 * Flight time used here is the same pair Logifi uses for total time: OOOI
 * Out → In (block), not Off → On. Night hours are capped at that duration.
 *
 * Two-location: interpolate lat/lon along the route and test night at the
 * aircraft's position. The old union of "night at either airport" over-counted
 * (day at departure + night at destination ⇒ entire overlap logged as night).
 */

import { DateTime } from 'luxon'
import { getCivilTwilight } from './solarCalculator'

export interface NightTimeParams {
  /** Flight date (YYYY-MM-DD) */
  date: string
  depLatitude: number
  depLongitude: number
  destLatitude?: number
  destLongitude?: number
  /** OOOI Out (HH:MM or HHMM) */
  outTime: string
  /** OOOI In (HH:MM or HHMM) */
  inTime: string
  /** When true, Out/In are UTC. Default true. */
  isZulu?: boolean
  /** IANA zone for Out when isZulu is false (departure airport). */
  outTimezone?: string | null
  /** IANA zone for In when isZulu is false (arrival airport). */
  inTimezone?: string | null
}

export interface NightTimeResult {
  nightHours: number
  totalHours: number
  eveningTwilight: Date | null
  morningTwilight: Date | null
  success: boolean
  error?: string
}

interface NightInterval {
  start: Date
  end: Date
}

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_MINUTE = 1000 * 60
const MS_PER_DAY = 24 * MS_PER_HOUR

const twilightCache = new Map<string, ReturnType<typeof getCivilTwilight>>()

function twilightKey(date: Date, lat: number, lon: number): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}|${lat.toFixed(4)}|${lon.toFixed(4)}`
}

function cachedTwilight(date: Date, lat: number, lon: number) {
  const key = twilightKey(date, lat, lon)
  const hit = twilightCache.get(key)
  if (hit) return hit
  const value = getCivilTwilight(date, lat, lon)
  twilightCache.set(key, value)
  return value
}

function parseYmd(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null
  let normalized = dateStr.trim()
  if (normalized.includes('/')) {
    const parts = normalized.split('/')
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      normalized = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    }
  }
  const parts = normalized.split('-')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null
  const year = Number.parseInt(parts[0], 10)
  const month = Number.parseInt(parts[1], 10)
  const day = Number.parseInt(parts[2], 10)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

function parseClock(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr) return null
  const trimmed = timeStr.trim()
  const colon = trimmed.split(':')
  if (colon.length >= 2) {
    const hour = Number.parseInt(colon[0], 10)
    const minute = Number.parseInt(colon[1], 10)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    return { hour, minute }
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 3 || digits.length > 4) return null
  const padded = digits.padStart(4, '0')
  const hour = Number.parseInt(padded.slice(0, 2), 10)
  const minute = Number.parseInt(padded.slice(2, 4), 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function overlapMs(start1: number, end1: number, start2: number, end2: number): number {
  return Math.max(0, Math.min(end1, end2) - Math.max(start1, start2))
}

function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10
}

function sameCoords(
  depLat: number,
  depLon: number,
  destLat: number | undefined,
  destLon: number | undefined
): boolean {
  if (destLat === undefined || destLon === undefined) return true
  if (Number.isNaN(destLat) || Number.isNaN(destLon)) return true
  return Math.abs(depLat - destLat) < 1e-4 && Math.abs(depLon - destLon) < 1e-4
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Night intervals covering [from, to]: for each calendar day D, [dusk(D), dawn(D+1)].
 */
export function nightIntervalsForLocation(
  from: Date,
  to: Date,
  latitude: number,
  longitude: number
): NightInterval[] {
  const startDay = utcDayStart(addUtcDays(from, -1))
  const endDay = utcDayStart(addUtcDays(to, 1))
  const periods: NightInterval[] = []

  for (let day = startDay; day.getTime() <= endDay.getTime(); day = addUtcDays(day, 1)) {
    const nextDay = addUtcDays(day, 1)
    const tw = cachedTwilight(day, latitude, longitude)
    const twNext = cachedTwilight(nextDay, latitude, longitude)

    if (tw.isPolarNight) {
      periods.push({ start: day, end: nextDay })
      continue
    }
    if (tw.isPolarDay) continue
    if (tw.eveningEnd && twNext.morningStart && tw.eveningEnd.getTime() < twNext.morningStart.getTime()) {
      periods.push({ start: tw.eveningEnd, end: twNext.morningStart })
    }
  }

  return periods
}

function isInstantInNight(timeMs: number, periods: NightInterval[]): boolean {
  for (const period of periods) {
    if (timeMs >= period.start.getTime() && timeMs < period.end.getTime()) return true
  }
  return false
}

function isNightAtInstant(time: Date, latitude: number, longitude: number): boolean {
  const periods = nightIntervalsForLocation(time, time, latitude, longitude)
  return isInstantInNight(time.getTime(), periods)
}

function overlapNightMs(out: Date, inn: Date, periods: NightInterval[]): number {
  const outMs = out.getTime()
  const inMs = inn.getTime()
  let total = 0
  for (const period of periods) {
    total += overlapMs(outMs, inMs, period.start.getTime(), period.end.getTime())
  }
  return total
}

function twoLocationNightMs(
  out: Date,
  inn: Date,
  depLat: number,
  depLon: number,
  destLat: number,
  destLon: number
): number {
  const depPeriods = nightIntervalsForLocation(out, inn, depLat, depLon)
  const destPeriods = nightIntervalsForLocation(out, inn, destLat, destLon)
  const outMs = out.getTime()
  const inMs = inn.getTime()
  const duration = inMs - outMs
  if (duration <= 0) return 0

  let nightMs = 0
  for (let t = outMs; t < inMs; t += MS_PER_MINUTE) {
    const slice = Math.min(MS_PER_MINUTE, inMs - t)
    const depNight = isInstantInNight(t, depPeriods)
    const destNight = isInstantInNight(t, destPeriods)
    let night = depNight
    if (depNight !== destNight) {
      const frac = duration === 0 ? 0 : (t - outMs) / duration
      night = isNightAtInstant(new Date(t), lerp(depLat, destLat, frac), lerp(depLon, destLon, frac))
    }
    if (night) nightMs += slice
  }
  return nightMs
}

export function parseClockToInstant(
  dateStr: string,
  timeStr: string,
  isZulu: boolean,
  timezone?: string | null
): Date | null {
  const ymd = parseYmd(dateStr)
  const clock = parseClock(timeStr)
  if (!ymd || !clock) return null

  if (isZulu) {
    return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, clock.hour, clock.minute, 0))
  }

  if (timezone) {
    const dt = DateTime.fromObject(
      {
        year: ymd.year,
        month: ymd.month,
        day: ymd.day,
        hour: clock.hour,
        minute: clock.minute,
        second: 0,
      },
      { zone: timezone }
    )
    return dt.isValid ? dt.toJSDate() : null
  }

  // Last-resort: host local (legacy isZulu:false without a zone).
  return new Date(ymd.year, ymd.month - 1, ymd.day, clock.hour, clock.minute, 0)
}

function ensureInAfterOut(out: Date, inn: Date): Date {
  if (inn.getTime() >= out.getTime()) return inn
  return new Date(inn.getTime() + MS_PER_DAY)
}

export function calculateNightTimeFromInstants(params: {
  out: Date
  in: Date
  depLatitude: number
  depLongitude: number
  destLatitude?: number
  destLongitude?: number
}): NightTimeResult {
  const { out, depLatitude, depLongitude, destLatitude, destLongitude } = params
  const inn = params.in
  if (Number.isNaN(out.getTime()) || Number.isNaN(inn.getTime()) || inn.getTime() <= out.getTime()) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Invalid flight interval',
    }
  }

  if (Number.isNaN(depLatitude) || Number.isNaN(depLongitude)) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Invalid departure coordinates',
    }
  }

  const totalMs = inn.getTime() - out.getTime()
  const totalHours = totalMs / MS_PER_HOUR
  const flightDate = utcDayStart(out)
  const depTwilight = cachedTwilight(flightDate, depLatitude, depLongitude)

  let nightMs: number
  if (sameCoords(depLatitude, depLongitude, destLatitude, destLongitude)) {
    if (depTwilight.isPolarNight) {
      nightMs = totalMs
    } else if (depTwilight.isPolarDay) {
      nightMs = 0
    } else {
      nightMs = overlapNightMs(
        out,
        inn,
        nightIntervalsForLocation(out, inn, depLatitude, depLongitude)
      )
    }
  } else {
    nightMs = twoLocationNightMs(
      out,
      inn,
      depLatitude,
      depLongitude,
      destLatitude as number,
      destLongitude as number
    )
  }

  const nightHours = Math.min(totalHours, nightMs / MS_PER_HOUR)

  return {
    nightHours: roundHours(nightHours),
    totalHours: roundHours(totalHours),
    eveningTwilight: depTwilight.eveningEnd,
    morningTwilight: depTwilight.morningStart,
    success: true,
  }
}

export function calculateNightTime(params: NightTimeParams): NightTimeResult {
  const {
    date,
    depLatitude,
    depLongitude,
    destLatitude,
    destLongitude,
    outTime,
    inTime,
    isZulu = true,
    outTimezone,
    inTimezone,
  } = params

  if (!date || !outTime || !inTime) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Missing required parameters (date, outTime, or inTime)',
    }
  }

  if (Number.isNaN(depLatitude) || Number.isNaN(depLongitude)) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Invalid departure coordinates',
    }
  }

  const outDate = parseClockToInstant(date, outTime, isZulu, isZulu ? 'UTC' : outTimezone)
  const inParsed = parseClockToInstant(date, inTime, isZulu, isZulu ? 'UTC' : (inTimezone || outTimezone))

  if (!outDate || !inParsed) {
    return {
      nightHours: 0,
      totalHours: 0,
      eveningTwilight: null,
      morningTwilight: null,
      success: false,
      error: 'Invalid time format',
    }
  }

  const inDate = ensureInAfterOut(outDate, inParsed)
  return calculateNightTimeFromInstants({
    out: outDate,
    in: inDate,
    depLatitude,
    depLongitude,
    destLatitude,
    destLongitude,
  })
}

/** Rough hint only — not used for logged night. */
export function mightHaveNightTime(outTime: string, inTime: string): boolean {
  if (!outTime || !inTime) return false
  const outClock = parseClock(outTime)
  const inClock = parseClock(inTime)
  if (!outClock || !inClock) return false
  const eveningStart = 17
  const morningEnd = 7
  if (inClock.hour < outClock.hour) return true
  return outClock.hour >= eveningStart || inClock.hour <= morningEnd || outClock.hour <= morningEnd
}
