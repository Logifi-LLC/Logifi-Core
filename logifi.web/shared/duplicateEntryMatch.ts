import { canonicalizeAirportCodeForMatch } from './airportCodeCanonical'

/**
 * Max difference in logged total time for two rows to still count as the same leg.
 * ~6 minutes covers FCV block (e.g. 1.35h) vs hand-entered rounded totals (e.g. 1.4h) and float noise.
 */
export const FLIGHT_TOTAL_HOURS_EPSILON = 0.1

export interface DuplicateEntryMatchShape {
  date: string
  registration: string
  departure: string
  destination: string
  oooiOut?: string | null
  flightTimeTotal?: number | null
  /** Night hours — part of import duplicate fingerprint */
  night?: number | null
  /** NVG hours — part of import duplicate fingerprint */
  nvg?: number | null
  /** Actual instrument hours */
  actualInstrument?: number | null
  /** Simulated instrument (hood) hours */
  simulatedInstrument?: number | null
}

/**
 * - `standard`: full rules including approximate total time when OOOI out is not decisive (in-app duplicate hints).
 * - `importLeg`: same calendar date + tail + canonical route; if both rows have OOOI out, they must match; otherwise
 *   total time is ignored so FC View block vs hand-entered hours does not miss a duplicate.
 */
export type DuplicateMatchMode = 'standard' | 'importLeg'

const TIME_BREAKDOWN_KEYS = [
  'night',
  'nvg',
  'actualInstrument',
  'simulatedInstrument',
] as const satisfies readonly (keyof DuplicateEntryMatchShape)[]

function normalizeRegistrationForMatch(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeTimeField(value: number | null | undefined): number {
  if (value === null || value === undefined || typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }
  return Math.round(value * 10) / 10
}

function totalsMatchApproximately(a: number, b: number): boolean {
  return Math.abs(a - b) <= FLIGHT_TOTAL_HOURS_EPSILON
}

/** Same UNKNOWN / empty rules as legacy duplicate check, then IATA/ICAO canonicalization. */
function airportFieldForMatch(value: string | undefined): string {
  const raw = (value || 'UNKNOWN').trim().toUpperCase()
  if (raw === '' || raw === 'UNKNOWN') return raw
  return canonicalizeAirportCodeForMatch(raw)
}

function isBothRouteUnknown(entry: DuplicateEntryMatchShape, existing: DuplicateEntryMatchShape): boolean {
  return (
    airportFieldForMatch(entry.departure) === 'UNKNOWN' &&
    airportFieldForMatch(entry.destination) === 'UNKNOWN' &&
    airportFieldForMatch(existing.departure) === 'UNKNOWN' &&
    airportFieldForMatch(existing.destination) === 'UNKNOWN'
  )
}

/** Night, NVG, actual, and hood must match exactly (null/undefined → 0). */
function timeBreakdownMatches(entry: DuplicateEntryMatchShape, existing: DuplicateEntryMatchShape): boolean {
  for (const key of TIME_BREAKDOWN_KEYS) {
    if (normalizeTimeField(entry[key]) !== normalizeTimeField(existing[key])) {
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
  if (existingOut && entryOut) {
    return existingOut === entryOut
  }

  if (mode === 'importLeg') {
    return true
  }

  if (!timeBreakdownMatches(entry, existing)) {
    return false
  }

  const existingTotal = existing.flightTimeTotal
  const entryTotal = entry.flightTimeTotal
  if (
    existingTotal !== null &&
    existingTotal !== undefined &&
    entryTotal !== null &&
    entryTotal !== undefined &&
    typeof existingTotal === 'number' &&
    typeof entryTotal === 'number'
  ) {
    const entryNorm = normalizeTimeField(entryTotal)
    const existingNorm = normalizeTimeField(existingTotal)
    if (isBothRouteUnknown(entry, existing)) {
      return entryNorm === existingNorm
    }
    return totalsMatchApproximately(entryNorm, existingNorm)
  }

  return true
}
