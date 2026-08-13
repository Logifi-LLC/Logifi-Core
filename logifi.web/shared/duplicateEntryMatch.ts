import { canonicalizeAirportCodeForMatch } from './airportCodeCanonical'

export interface DuplicateEntryMatchShape {
  date: string
  registration: string
  departure: string
  destination: string
  oooiOut?: string | null
  /** Airline flight number when known (e.g. 4442 or YX4442). */
  flightNumber?: string | null
  role?: string | null
  flightTimeTotal?: number | null
  pic?: number | null
  sic?: number | null
  dual?: number | null
  solo?: number | null
  /** Night hours — part of import duplicate fingerprint */
  night?: number | null
  /** NVG hours — part of import duplicate fingerprint */
  nvg?: number | null
  /** Actual instrument hours */
  actualInstrument?: number | null
  /** Simulated instrument (hood) hours */
  simulatedInstrument?: number | null
  dualGiven?: number | null
  crossCountry?: number | null
  dayTakeoffs?: number | null
  nightTakeoffs?: number | null
  dayLandings?: number | null
  nightLandings?: number | null
  approachCount?: number | null
  holdingProcedures?: number | null
}

/**
 * - `standard`: same date, tail, route, role, rounded flight-time buckets, and performance counts.
 *   OOOI out is an extra constraint when both sides have it (in-app + CSV import duplicate hints).
 * - `importLeg`: same calendar date + tail + canonical route; if both rows have OOOI out, they must match; otherwise
 *   total time is ignored so FC View block vs hand-entered hours does not miss a duplicate.
 */
export type DuplicateMatchMode = 'standard' | 'importLeg'

const FLIGHT_TIME_KEYS = [
  'flightTimeTotal',
  'pic',
  'sic',
  'dual',
  'solo',
  'night',
  'nvg',
  'actualInstrument',
  'simulatedInstrument',
  'dualGiven',
  'crossCountry',
] as const satisfies readonly (keyof DuplicateEntryMatchShape)[]

const PERFORMANCE_COUNT_KEYS = [
  'dayTakeoffs',
  'nightTakeoffs',
  'dayLandings',
  'nightLandings',
  'approachCount',
  'holdingProcedures',
] as const satisfies readonly (keyof DuplicateEntryMatchShape)[]

function normalizeRegistrationForMatch(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeRoleForMatch(value: string | null | undefined): string {
  return (value || '').trim().toUpperCase()
}

function normalizeTimeField(value: number | null | undefined): number {
  if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }
  return Math.round(value * 10) / 10
}

function normalizeCountField(value: number | null | undefined): number {
  if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }
  return Math.round(value)
}

/** Parse OOOI out to minutes since midnight; accepts `HHMM`, `HH:MM`, etc. */
export function normalizeOooiOutForMatch(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  let digits = trimmed.replace(/\D/g, '')
  if (digits.length === 3) digits = `0${digits}`
  digits = digits.padStart(4, '0')
  if (digits.length !== 4) return null

  const hours = parseInt(digits.slice(0, 2), 10)
  const minutes = parseInt(digits.slice(2, 4), 10)
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }
  return hours * 60 + minutes
}

function oooiOutMatches(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const aNorm = normalizeOooiOutForMatch(a)
  const bNorm = normalizeOooiOutForMatch(b)
  if (aNorm !== null && bNorm !== null) return aNorm === bNorm
  if (a && b) return String(a).trim() === String(b).trim()
  return false
}

/** Same UNKNOWN / empty rules as legacy duplicate check, then IATA/ICAO canonicalization. */
function airportFieldForMatch(value: string | undefined): string {
  const raw = (value || 'UNKNOWN').trim().toUpperCase()
  if (raw === '' || raw === 'UNKNOWN') return raw
  return canonicalizeAirportCodeForMatch(raw)
}

/** Night, NVG, PIC, and other hour buckets must match after 0.1h rounding (null/undefined → 0). */
function flightTimeBucketsMatch(entry: DuplicateEntryMatchShape, existing: DuplicateEntryMatchShape): boolean {
  for (const key of FLIGHT_TIME_KEYS) {
    if (normalizeTimeField(entry[key] as number | null | undefined) !==
      normalizeTimeField(existing[key] as number | null | undefined)) {
      return false
    }
  }
  return true
}

function performanceCountsMatch(entry: DuplicateEntryMatchShape, existing: DuplicateEntryMatchShape): boolean {
  for (const key of PERFORMANCE_COUNT_KEYS) {
    if (normalizeCountField(entry[key] as number | null | undefined) !==
      normalizeCountField(existing[key] as number | null | undefined)) {
      return false
    }
  }
  return true
}

/**
 * Pure duplicate check. Always requires same **date**, **registration**, and **canonical departure/destination**.
 * OOOI / total handling depends on `mode` (see `DuplicateMatchMode`).
 */
export function entriesDuplicateMatch(
  entry: DuplicateEntryMatchShape,
  existing: DuplicateEntryMatchShape,
  mode: DuplicateMatchMode = 'standard'
): boolean {
  if (
    existing.date !== entry.date ||
    normalizeRegistrationForMatch(existing.registration) !==
      normalizeRegistrationForMatch(entry.registration)
  ) {
    return false
  }

  const existingDep = airportFieldForMatch(existing.departure)
  const entryDep = airportFieldForMatch(entry.departure)
  const existingDest = airportFieldForMatch(existing.destination)
  const entryDest = airportFieldForMatch(entry.destination)

  if (existingDep !== entryDep || existingDest !== entryDest) {
    if (
      !(
        existingDep === 'UNKNOWN' &&
        entryDep === 'UNKNOWN' &&
        existingDest === 'UNKNOWN' &&
        entryDest === 'UNKNOWN'
      )
    ) {
      return false
    }
  }

  const existingOut = existing.oooiOut
  const entryOut = entry.oooiOut
  if (existingOut && entryOut && !oooiOutMatches(existingOut, entryOut)) {
    return false
  }

  if (mode === 'importLeg') {
    return true
  }

  if (normalizeRoleForMatch(entry.role) !== normalizeRoleForMatch(existing.role)) {
    return false
  }

  if (!flightTimeBucketsMatch(entry, existing)) {
    return false
  }

  return performanceCountsMatch(entry, existing)
}
