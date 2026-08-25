/** Import JSON directly — package `index.esm.js` uses `require()`, which breaks in the browser. */
import airportsJson from '@nwpr/airport-codes/dist/airports.json' with { type: 'json' }

type AirportRow = { icao?: string; iata?: string }

const airports = airportsJson as readonly AirportRow[]

const icaoSet = new Set<string>()
const iataToIcao = new Map<string, string>()

for (const a of airports) {
  const icao = typeof a.icao === 'string' ? a.icao.trim().toUpperCase() : ''
  if (icao) icaoSet.add(icao)
  const iata = typeof a.iata === 'string' ? a.iata.trim().toUpperCase() : ''
  if (iata && icao) iataToIcao.set(iata, icao)
}

/**
 * Normalize airport codes for duplicate / leg matching, and for airline-imported log entries
 * so they match the airport catalog (IATA → ICAO when known).
 */
export function canonicalizeAirportCodeForMatch(code: string): string {
  const raw = (code ?? '').trim().toUpperCase()
  if (!raw) return raw

  if (icaoSet.has(raw)) return raw

  const fromIata = iataToIcao.get(raw)
  if (fromIata) return fromIata

  // US-style FAA/ICAO: K + 3-letter IATA (aligns with lookup-airport.get.ts)
  if (raw.length === 4 && raw.startsWith('K')) {
    const last3 = raw.slice(1)
    const mapped = iataToIcao.get(last3)
    if (mapped) return mapped
  }

  return raw
}

/**
 * Catalog ICAO form of an airport code when known (IATA LGA → KLGA).
 * ICAO passes through; unknown codes stay uppercase as entered.
 */
export function toCatalogAirportCode(code: string): string {
  return canonicalizeAirportCodeForMatch(code)
}
