import { computeAirlineNight } from '../../shared/airlineNight'
import { lookupAirportServer } from './airportLookupServer'
import { getAirportIanaTimezoneServer } from './airportIana'
import type { FcvMappedEntry } from './fcvMap'

function serverLookups() {
  return {
    lookupCoords: (code: string) => {
      const airport = lookupAirportServer(code)
      if (!airport) return null
      return { latitude: airport.latitude, longitude: airport.longitude }
    },
    lookupTz: getAirportIanaTimezoneServer,
  }
}

export function applyAirlineNightToMappedEntry(
  entry: FcvMappedEntry,
  raw: {
    outLocal?: string | null
    offLocal?: string | null
    inLocal?: string | null
    onLocal?: string | null
    isDeadhead?: boolean
  }
): void {
  if (raw.isDeadhead) return

  const result = computeAirlineNight(
    {
      depCode: entry.departure,
      arrCode: entry.destination,
      date: entry.date || null,
      outLocalDatetime: raw.outLocal ?? null,
      offLocalDatetime: raw.offLocal ?? null,
      inLocalDatetime: raw.inLocal ?? null,
      onLocalDatetime: raw.onLocal ?? null,
      oooi: entry.oooi,
    },
    serverLookups()
  )

  if (result.nightHours != null) {
    entry.flight_time = { ...entry.flight_time, night: result.nightHours }
  }

  // Takeoff and landing are classified on their own: a night takeoff can end in a day landing.
  // An unresolved departure airport leaves takeoffs null (currency then counts the landing).
  if (result.isNightTakeoff != null) {
    entry.performance = {
      ...entry.performance,
      ...(result.isNightTakeoff ? { nightTakeoffs: 1 } : { dayTakeoffs: 1 }),
    }
  }

  if (result.isNightLanding != null) {
    entry.performance = {
      ...entry.performance,
      ...(result.isNightLanding ? { nightLandings: 1 } : { dayLandings: 1 }),
    }
  }
}
