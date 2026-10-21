import {
  findAirportClientRow,
  normalizeAirportCodeInput,
  type AirportClientRow,
} from './airportDbCore'
import { ensureAirportClientDbLoaded, getAirportClientDbIfLoaded } from './airportClientDb'

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
const COORDINATE_OVERRIDES: Record<
  string,
  {
    latitude: number
    longitude: number
    name?: string
    city?: string
    state?: string
    country?: string
  }
> = {
  KLAF: {
    latitude: 40.4123,
    longitude: -86.9369,
    name: 'Purdue University Airport',
    city: 'West Lafayette',
    state: 'IN',
    country: 'US',
  },
  KMCX: {
    latitude: 40.71019,
    longitude: -86.76679,
    name: 'White County Airport',
    city: 'Monticello',
    state: 'IN',
    country: 'US',
  },
}

function rowToAirportInfo(normalizedCode: string, icao: string, row: AirportClientRow): AirportInfo {
  return {
    code: normalizedCode,
    icao,
    iata: row.iata || (normalizedCode.length === 3 ? normalizedCode : undefined),
    name: row.name || `${normalizedCode} Airport`,
    city: row.city || undefined,
    state: row.state || undefined,
    country: row.country || undefined,
    elevation: row.elevationFt != null ? `${row.elevationFt} ft` : undefined,
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    timezone: row.timezone ?? undefined,
    source: 'Static Airport Database',
  }
}

function lookupFromLoadedDb(normalizedCode: string): AirportInfo | null {
  const db = getAirportClientDbIfLoaded()
  if (!db) return null

  const match = findAirportClientRow(db, normalizedCode)
  if (!match) return null
  return rowToAirportInfo(normalizedCode, match.icao, match.row)
}

/**
 * Offline airport lookup (sync). Returns null until {@link ensureAirportClientDbLoaded} has resolved.
 * Coordinate overrides are available immediately.
 */
export function lookupAirportLocal(code: string): AirportInfo | null {
  if (!code || code.trim().length === 0) {
    return null
  }

  const normalizedCode = normalizeAirportCodeInput(code)

  if (normalizedCode.length < 3 || normalizedCode.length > 4) {
    return null
  }

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

  return lookupFromLoadedDb(normalizedCode)
}

/** Async lookup — awaits the client catalog before querying (except overrides). */
export async function lookupAirportLocalAsync(code: string): Promise<AirportInfo | null> {
  if (!code || code.trim().length === 0) {
    return null
  }

  const normalizedCode = normalizeAirportCodeInput(code)

  if (normalizedCode.length < 3 || normalizedCode.length > 4) {
    return null
  }

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

  await ensureAirportClientDbLoaded()
  return lookupFromLoadedDb(normalizedCode)
}

export { ensureAirportClientDbLoaded, getAirportClientDbIfLoaded } from './airportClientDb'
