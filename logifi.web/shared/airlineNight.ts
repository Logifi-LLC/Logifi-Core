/**
 * Night TIME (FAR 1.1 civil twilight) and night LANDINGS (FAR 61.57(b)) for
 * Autofi / airline legs.
 *
 * Full source datetimes are airport-local (or ISO-Z) regardless of stored
 * `oooi.isZulu`. HHMM clocks on `oooi` follow that flag.
 *
 * Night hours use Out→In (block), matching Logifi total time.
 * Night landings use On at the arrival airport, then In if On is missing.
 */

import { calculateNightTimeFromInstants } from './nightTimeCalculator'
import { isFarNightLanding } from './nightLanding'
import {
  looksLikeUtcIso,
  oooiClockToUtc,
  parseAirlineLocalDatetimeInZone,
  parseAirlineUtcDatetime,
} from './oooiClock'

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
  const parsed = parseAirlineLocalDatetimeInZone(dt, zone)
  return parsed ? parsed.toJSDate() : null
}

function parseSourceDatetime(dt: string, zone: string | null): Date | null {
  if (looksLikeUtcIso(dt)) {
    const parsed = parseAirlineUtcDatetime(dt)
    return parsed ? parsed.toJSDate() : null
  }
  if (!zone) return null
  return parseLocalDatetimeInZone(dt, zone)
}

function parseClockOnDate(
  dateYmd: string,
  hhmm: string,
  isZulu: boolean,
  zone: string | null
): Date | null {
  const dt = oooiClockToUtc(dateYmd, hhmm, isZulu, zone)
  return dt ? dt.toJSDate() : null
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
  const depTz = lookups.lookupTz(dep)
  const arrTz = lookups.lookupTz(arr) ?? depTz

  let outInstant: Date | null = null
  let inInstant: Date | null = null
  let landingInstant: Date | null = null

  if (input.outLocalDatetime) {
    outInstant = parseSourceDatetime(input.outLocalDatetime, depTz)
  }
  if (input.inLocalDatetime) {
    inInstant = parseSourceDatetime(input.inLocalDatetime, arrTz)
  }
  if (input.onLocalDatetime) {
    landingInstant = parseSourceDatetime(input.onLocalDatetime, arrTz)
  }

  const dateYmd = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null
  const clockDepTz = isZulu ? 'UTC' : depTz
  const clockArrTz = isZulu ? 'UTC' : arrTz
  if (!outInstant && dateYmd && input.oooi?.out) {
    outInstant = parseClockOnDate(dateYmd, input.oooi.out, isZulu, clockDepTz)
  }
  if (!inInstant && dateYmd && input.oooi?.in) {
    inInstant = parseClockOnDate(dateYmd, input.oooi.in, isZulu, clockArrTz)
  }
  if (!landingInstant && dateYmd && input.oooi?.on) {
    landingInstant = parseClockOnDate(dateYmd, input.oooi.on, isZulu, clockArrTz)
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
