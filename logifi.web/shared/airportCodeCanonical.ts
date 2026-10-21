import { canonicalizeAirportCodeWithDb } from './airportDbCore'
import { getAirportClientDbIfLoaded } from './airportClientDb'

/**
 * Normalize airport codes for duplicate / leg matching, and for airline-imported log entries
 * so they match the airport catalog (IATA → ICAO when known).
 *
 * Before the client catalog loads, returns uppercase trimmed input only (no IATA → ICAO guess).
 */
export function canonicalizeAirportCodeForMatch(code: string): string {
  const raw = (code ?? '').trim().toUpperCase()
  if (!raw) return raw

  const db = getAirportClientDbIfLoaded()
  if (!db) return raw

  return canonicalizeAirportCodeWithDb(db, code)
}

/**
 * Catalog ICAO form of an airport code when known (IATA LGA → KLGA).
 * ICAO passes through; unknown codes stay uppercase as entered.
 */
export function toCatalogAirportCode(code: string): string {
  return canonicalizeAirportCodeForMatch(code)
}
