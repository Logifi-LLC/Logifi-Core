import airportsJson from '@nwpr/airport-codes/dist/airports.json' with { type: 'json' }
import type { AirportClientDb, AirportClientRow } from '../../shared/airportDbCore'

interface NwprAirport {
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

function buildAirportClientDb(airports: readonly NwprAirport[]): AirportClientDb {
  const rows: Record<string, AirportClientRow> = {}
  const iataToIcao: Record<string, string> = {}

  for (const a of airports) {
    const icao = typeof a.icao === 'string' ? a.icao.trim().toUpperCase() : ''
    if (!icao) continue

    const iata = typeof a.iata === 'string' ? a.iata.trim().toUpperCase() : ''
    if (iata) iataToIcao[iata] = icao

    const elevationFt =
      a.elevation != null
        ? Number(a.elevation)
        : a.altitude != null
          ? Number(a.altitude)
          : undefined

    rows[icao] = {
      ...(iata ? { iata } : {}),
      ...(a.name ? { name: a.name } : {}),
      ...(a.city ? { city: a.city } : {}),
      ...(a.state ? { state: a.state } : {}),
      ...(a.country ? { country: a.country } : {}),
      ...(elevationFt != null && Number.isFinite(elevationFt) ? { elevationFt } : {}),
      ...(a.latitude != null ? { latitude: Number(a.latitude) } : {}),
      ...(a.longitude != null ? { longitude: Number(a.longitude) } : {}),
      ...(a.timezone != null && a.timezone !== '' ? { timezone: a.timezone } : {}),
    }
  }

  return { version: 1, rows, iataToIcao }
}

const serverDb = buildAirportClientDb(airportsJson as NwprAirport[])

export function getServerAirportClientDb(): AirportClientDb {
  return serverDb
}
