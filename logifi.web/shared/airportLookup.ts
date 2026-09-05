/** Import JSON directly — package entry uses `require()`, which breaks client bundles if pulled in transitively. */
import airportsJson from '@nwpr/airport-codes/dist/airports.json' with { type: 'json' }

export interface AirportInfo {
  code: string
  icao?: string
  iata?: string
  name?: string
  city?: string
  state?: string
  country?: string
  elevation?: string
  latitude?: number
  longitude?: number
  timezone?: string | number
  source?: string
}

/** Coordinate overrides for airports where @nwpr/airport-codes has wrong or ambiguous data (e.g. KMCX → MCX Russia). */
const COORDINATE_OVERRIDES: Record<string, { latitude: number; longitude: number; name?: string; city?: string; state?: string; country?: string }> = {
  KLAF: { latitude: 40.4123, longitude: -86.9369, name: 'Purdue University Airport', city: 'West Lafayette', state: 'IN', country: 'US' },
  KMCX: { latitude: 40.71019, longitude: -86.76679, name: 'White County Airport', city: 'Monticello', state: 'IN', country: 'US' },
}

interface Airport {
  icao?: string
  iata?: string
  name?: string
  city?: string
  state?: string
  country?: string
  elevation?: number
  altitude?: number
  latitude?: number
  longitude?: number
  timezone?: string | number
}

const airports = airportsJson as Airport[]

/**
 * Offline airport lookup using bundled @nwpr/airport-codes (same logic as server/api/lookup-airport.get.ts).
 */
export function lookupAirportLocal(code: string): AirportInfo | null {
  if (!code || code.trim().length === 0) {
    return null
  }

  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')

  if (normalizedCode.length < 3 || normalizedCode.length > 4) {
    return null
  }

  let airport: Airport | undefined

  if (normalizedCode.length === 4) {
    airport = airports.find((a) => a.icao === normalizedCode)
  }

  if (!airport && normalizedCode.length === 3) {
    airport = airports.find((a) => a.iata === normalizedCode)
  }

  // Do not fall back to IATA = last 3 of a 4-letter miss (KAWA→AWA Awassa).
  // Exact ICAO / IATA only; US supplement covers GA codes missing from nwpr.

  const override = COORDINATE_OVERRIDES[normalizedCode]
  if (override) {
    return {
      code: normalizedCode,
      icao: normalizedCode.length === 4 ? normalizedCode : undefined,
      iata: normalizedCode.length === 3 ? normalizedCode : undefined,
      name: override.name ?? `${normalizedCode} Airport`,
      city: override.city,
      state: override.state,
      country: override.country,
      latitude: override.latitude,
      longitude: override.longitude,
      source: 'Coordinate override',
    }
  }

  if (airport) {
    return {
      code: normalizedCode,
      icao: airport.icao || undefined,
      iata: airport.iata || undefined,
      name: airport.name || `${normalizedCode} Airport`,
      city: airport.city || undefined,
      state: airport.state || undefined,
      country: airport.country || undefined,
      elevation:
        airport.elevation != null
          ? `${airport.elevation} ft`
          : airport.altitude != null
            ? `${airport.altitude} ft`
            : undefined,
      latitude: airport.latitude ? Number(airport.latitude) : undefined,
      longitude: airport.longitude ? Number(airport.longitude) : undefined,
      timezone: airport.timezone || undefined,
      source: 'Static Airport Database',
    }
  }

  return null
}
