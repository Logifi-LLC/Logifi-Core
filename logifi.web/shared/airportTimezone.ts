/** Import JSON directly — package entry uses `require()`, which breaks client bundles if pulled in transitively. */
import airportsJson from '@nwpr/airport-codes/dist/airports.json' with { type: 'json' }
import { DateTime } from 'luxon'

interface AirportRow {
  icao?: string
  iata?: string
  timezone?: string | number
}

const airports = airportsJson as readonly AirportRow[]

/**
 * Convert airport timezone string to IANA timezone format.
 * Airport timezones are often "America/Chicago", "UTC-6", or numeric offsets like -5.
 */
export function normalizeTimezoneToIANA(timezone: string | undefined | null): string | null {
  if (timezone == null) return null
  const tz = typeof timezone === 'string' ? timezone : String(timezone)
  if (!tz) return null

  if (tz.includes('/')) {
    return tz
  }

  const offsetMatch1 = tz.match(/^([+-]?)(\d{1,2})(?::\d{2})?$/)
  const offsetMatch2 = tz.match(/^UTC([+-])(\d{1,2})$/i)

  let offset: number | null = null

  if (offsetMatch1 && offsetMatch1[2]) {
    const sign = offsetMatch1[1] || '-'
    const hours = offsetMatch1[2]
    offset = parseInt(sign + hours, 10)
  } else if (offsetMatch2) {
    const sign = offsetMatch2[1]
    const hours = offsetMatch2[2]
    if (sign && hours) {
      offset = parseInt(sign + hours, 10)
    }
  }

  if (offset !== null) {
    const offsetToTimezone: Record<string, string> = {
      '-10': 'Pacific/Honolulu',
      '-9': 'America/Anchorage',
      '-8': 'America/Los_Angeles',
      '-7': 'America/Denver',
      '-6': 'America/Chicago',
      '-5': 'America/New_York',
      '-4': 'America/New_York',
    }
    const mapped = offsetToTimezone[offset.toString()]
    if (mapped) return mapped
  }

  const timezoneMap: Record<string, string> = {
    'America/New_York': 'America/New_York',
    'America/Chicago': 'America/Chicago',
    'America/Denver': 'America/Denver',
    'America/Los_Angeles': 'America/Los_Angeles',
    'America/Phoenix': 'America/Phoenix',
    'America/Anchorage': 'America/Anchorage',
    'Pacific/Honolulu': 'Pacific/Honolulu',
    EST: 'America/New_York',
    EDT: 'America/New_York',
    CST: 'America/Chicago',
    CDT: 'America/Chicago',
    MST: 'America/Denver',
    MDT: 'America/Denver',
    PST: 'America/Los_Angeles',
    PDT: 'America/Los_Angeles',
    AKST: 'America/Anchorage',
    AKDT: 'America/Anchorage',
    HST: 'Pacific/Honolulu',
  }

  if (timezoneMap[tz]) {
    return timezoneMap[tz]
  }

  try {
    DateTime.now().setZone(tz)
    return tz
  } catch {
    return null
  }
}

function findAirportRow(normalizedCode: string): AirportRow | undefined {
  if (normalizedCode.length === 4) {
    const byIcao = airports.find((a) => a.icao === normalizedCode)
    if (byIcao) return byIcao
  }
  if (normalizedCode.length === 3) {
    const byIata = airports.find((a) => a.iata === normalizedCode)
    if (byIata) return byIata
  }
  // Exact ICAO / IATA only — do not treat last 3 of a 4-letter miss as IATA.
  return undefined
}

/**
 * Resolve ICAO/IATA/FAA-style airport code to an IANA timezone (sync, static DB).
 */
export function getAirportIanaTimezone(code: string | null | undefined): string | null {
  if (!code) return null
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
  if (normalizedCode.length < 3 || normalizedCode.length > 4) return null

  const airport = findAirportRow(normalizedCode)
  if (!airport?.timezone) return null
  return normalizeTimezoneToIANA(
    typeof airport.timezone === 'string' ? airport.timezone : String(airport.timezone)
  )
}
