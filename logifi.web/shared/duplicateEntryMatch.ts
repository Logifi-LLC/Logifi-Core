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
}

/**
 * - `standard`: full rules including approximate total time when OOOI out is not decisive (in-app duplicate hints).
 * - `importLeg`: same calendar date + tail + canonical route; if both rows have OOOI out, they must match; otherwise
 *   total time is ignored so FC View block vs hand-entered hours does not miss a duplicate.
 */
export type DuplicateMatchMode = 'standard' | 'importLeg'

function normalizeRegistrationForMatch(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function totalsMatchApproximately(a: number, b: number): boolean {
  return Math.abs(a - b) <= FLIGHT_TOTAL_HOURS_EPSILON
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
    return oooiOutMatches(existingOut, entryOut)
  }

  if (mode === 'importLeg') {
    return true
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
    return totalsMatchApproximately(existingTotal, entryTotal)
  }

  return true
}
