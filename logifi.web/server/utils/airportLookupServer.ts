import airportsJson from '@nwpr/airport-codes/dist/airports.json' with { type: 'json' }
import { lookupSupplementAirport } from './airportSupplement'

const COORDINATE_OVERRIDES: Record<string, {
  latitude: number
  longitude: number
  name?: string
  city?: string
  state?: string
  country?: string
}> = {
  KLAF: { latitude: 40.4123, longitude: -86.9369, name: 'Purdue University Airport', city: 'West Lafayette', state: 'IN', country: 'US' },
  KMCX: { latitude: 40.71019, longitude: -86.76679, name: 'White County Airport', city: 'Monticello', state: 'IN', country: 'US' },
  KFRR: { latitude: 38.918889, longitude: -78.154444, name: 'Front Royal-Warren County Airport', city: 'Front Royal', state: 'VA', country: 'US' },
  KFWA: { latitude: 40.978611, longitude: -85.195278, name: 'Fort Wayne International Airport', city: 'Fort Wayne', state: 'IN', country: 'US' }
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

export interface AirportLookupResult {
  code: string
  icao?: string
  iata?: string
  name: string
  city?: string
  state?: string
  country?: string
  latitude: number
  longitude: number
  source: string
}

/** Synchronous server-side airport lookup (nwpr + supplement + overrides). */
export function lookupAirportServer(code: string): AirportLookupResult | null {
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
  if (normalizedCode.length < 3 || normalizedCode.length > 4) return null

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
      source: 'Coordinate override'
    }
  }

  // Exact ICAO / IATA from nwpr first, then US supplement.
  // No last-3 IATA fallback (KAWA≠AWA, KTIP≠TIP) — that shadowed real US
  // ICAOs like KTIP (Rantoul) with foreign airports (Tripoli).
  let airport: Airport | undefined

  if (normalizedCode.length === 4) {
    airport = airports.find((a) => a.icao === normalizedCode)
  }
  if (!airport && normalizedCode.length === 3) {
    airport = airports.find((a) => a.iata === normalizedCode)
  }

  if (airport?.latitude != null && airport?.longitude != null) {
    return {
      code: normalizedCode,
      icao: airport.icao || undefined,
      iata: airport.iata || undefined,
      name: airport.name || `${normalizedCode} Airport`,
      city: airport.city || undefined,
      state: airport.state || undefined,
      country: airport.country || undefined,
      latitude: Number(airport.latitude),
      longitude: Number(airport.longitude),
      source: 'Static Airport Database'
    }
  }

  const supplement = lookupSupplementAirport(normalizedCode)
  if (supplement) {
    return {
      code: normalizedCode,
      icao: supplement.icao,
      iata: supplement.iata,
      name: supplement.name,
      city: supplement.city,
      state: supplement.state,
      country: supplement.country,
      latitude: supplement.latitude,
      longitude: supplement.longitude,
      source: 'US Airport Supplement (OurAirports)'
    }
  }

  return null
}

export function isKnownAirportCode(code: string): boolean {
  return lookupAirportServer(code) !== null
}
