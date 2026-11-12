/**
 * Night TIME (FAR 1.1 civil twilight) and night LANDINGS (FAR 61.57(b)) for
 * Autofi / airline legs. OOOI times are airport-local (isZulu: false).
 *
 * Night hours use Out→In (block), matching Logifi total time.
 * Night landings use On at the arrival airport, then In if On is missing.
 */

import { DateTime } from 'luxon'
import { calculateNightTimeFromInstants } from './nightTimeCalculator'
import { isFarNightLanding } from './nightLanding'

const FCV_LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/

export interface AirportCoords {
  latitude: number
  longitude: number
}

export interface AirlineNightLookups {
  lookupCoords: (code: string) => AirportCoords | null
  lookupTz: (code: string) => string | null
}

export interface AirlineNightInput {
  depCode: string
  arrCode: string
  /** YYYY-MM-DD fallback when a datetime string is missing the calendar day. */
  date?: string | null
  outLocalDatetime?: string | null
  inLocalDatetime?: string | null
  onLocalDatetime?: string | null
  oooi?: {
    out?: string | null
    in?: string | null
    on?: string | null
    isZulu?: boolean
  } | null
}

export interface AirlineNightResult {
  nightHours: number | null
  totalHours: number | null
  isNightLanding: boolean | null
}

export function parseLocalDatetimeInZone(dt: string, zone: string): Date | null {
  const m = dt.trim().match(FCV_LOCAL_DATETIME_RE)
  if (!m) return null
  const year = Number.parseInt(m[1], 10)
  const month = Number.parseInt(m[2], 10)
  const day = Number.parseInt(m[3], 10)
  const hour = Number.parseInt(m[4], 10)
  const minute = Number.parseInt(m[5], 10)
  const second = m[6] ? Number.parseInt(m[6], 10) : 0
  const dtObj = DateTime.fromObject({ year, month, day, hour, minute, second }, { zone })
  return dtObj.isValid ? dtObj.toJSDate() : null
}

function parseZuluDatetime(dt: string): Date | null {
  const m = dt.trim().match(FCV_LOCAL_DATETIME_RE)
  if (!m) return null
  const year = Number.parseInt(m[1], 10)
  const month = Number.parseInt(m[2], 10) - 1
  const day = Number.parseInt(m[3], 10)
  const hour = Number.parseInt(m[4], 10)
  const minute = Number.parseInt(m[5], 10)
  const second = m[6] ? Number.parseInt(m[6], 10) : 0
  const date = new Date(Date.UTC(year, month, day, hour, minute, second))
  return Number.isNaN(date.getTime()) ? null : date
}

function parseClockOnDate(
  dateYmd: string,
  hhmm: string,
  isZulu: boolean,
  zone: string | null
): Date | null {
  const digits = hhmm.replace(/\D/g, '').padStart(4, '0')
  if (digits.length !== 4 || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null
  const hour = Number.parseInt(digits.slice(0, 2), 10)
  const minute = Number.parseInt(digits.slice(2, 4), 10)
  if (hour > 23 || minute > 59) return null
  const [yearS, monthS, dayS] = dateYmd.split('-')
  const year = Number.parseInt(yearS, 10)
  const month = Number.parseInt(monthS, 10)
  const day = Number.parseInt(dayS, 10)
  if (isZulu || !zone) {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  }
  const dt = DateTime.fromObject({ year, month, day, hour, minute, second: 0 }, { zone })
  return dt.isValid ? dt.toJSDate() : null
}

function ensureInAfterOut(out: Date, inn: Date): Date {
  if (inn.getTime() >= out.getTime()) return inn
  return new Date(inn.getTime() + 24 * 60 * 60 * 1000)
}

export function computeAirlineNight(
  input: AirlineNightInput,
  lookups: AirlineNightLookups
): AirlineNightResult {
  const dep = input.depCode.trim()
  const arr = input.arrCode.trim()
  const depCoords = lookups.lookupCoords(dep)
  const arrCoords = lookups.lookupCoords(arr) ?? depCoords
  if (!depCoords) {
    return { nightHours: null, totalHours: null, isNightLanding: null }
  }

  const isZulu = input.oooi?.isZulu === true
  const depTz = isZulu ? 'UTC' : lookups.lookupTz(dep)
  const arrTz = isZulu ? 'UTC' : lookups.lookupTz(arr) ?? depTz

  let outInstant: Date | null = null
  let inInstant: Date | null = null
  let landingInstant: Date | null = null

  if (input.outLocalDatetime) {
    outInstant = isZulu
      ? parseZuluDatetime(input.outLocalDatetime)
      : depTz
        ? parseLocalDatetimeInZone(input.outLocalDatetime, depTz)
        : null
  }
  if (input.inLocalDatetime) {
    inInstant = isZulu
      ? parseZuluDatetime(input.inLocalDatetime)
      : arrTz
        ? parseLocalDatetimeInZone(input.inLocalDatetime, arrTz)
        : null
  }
  if (input.onLocalDatetime) {
    landingInstant = isZulu
      ? parseZuluDatetime(input.onLocalDatetime)
      : arrTz
        ? parseLocalDatetimeInZone(input.onLocalDatetime, arrTz)
        : null
  }

  const dateYmd = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null
  if (!outInstant && dateYmd && input.oooi?.out) {
    outInstant = parseClockOnDate(dateYmd, input.oooi.out, isZulu, depTz)
  }
  if (!inInstant && dateYmd && input.oooi?.in) {
    inInstant = parseClockOnDate(dateYmd, input.oooi.in, isZulu, arrTz)
  }
  if (!landingInstant && dateYmd && input.oooi?.on) {
    landingInstant = parseClockOnDate(dateYmd, input.oooi.on, isZulu, arrTz)
  }

  if (!outInstant || !inInstant) {
    return { nightHours: null, totalHours: null, isNightLanding: null }
  }

  inInstant = ensureInAfterOut(outInstant, inInstant)
  if (landingInstant && landingInstant.getTime() < outInstant.getTime()) {
    landingInstant = ensureInAfterOut(outInstant, landingInstant)
  }

  const night = calculateNightTimeFromInstants({
    out: outInstant,
    in: inInstant,
    depLatitude: depCoords.latitude,
    depLongitude: depCoords.longitude,
    destLatitude: arrCoords?.latitude,
    destLongitude: arrCoords?.longitude,
  })

  const landingAt = landingInstant ?? inInstant
  const landingCoords = arrCoords ?? depCoords
  const isNightLanding = isFarNightLanding(
    landingAt,
    landingCoords.latitude,
    landingCoords.longitude
  )

  return {
    nightHours: night.success ? night.nightHours : null,
    totalHours: night.success ? night.totalHours : null,
    isNightLanding,
  }
}
