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
    inLocal?: string | null
    onLocal?: string | null
    isDeadhead?: boolean
  }
): void {
  const result = computeAirlineNight(
    {
      depCode: entry.departure,
      arrCode: entry.destination,
      date: entry.date || null,
      outLocalDatetime: raw.outLocal ?? null,
      inLocalDatetime: raw.inLocal ?? null,
      onLocalDatetime: raw.onLocal ?? null,
      oooi: entry.oooi,
    },
    serverLookups()
  )

  if (result.nightHours != null) {
    entry.flight_time = { ...entry.flight_time, night: result.nightHours }
  }

  if (raw.isDeadhead || result.isNightLanding == null) return

  entry.performance = {
    ...entry.performance,
    ...(result.isNightLanding ? { nightLandings: 1 } : { dayLandings: 1 }),
  }
}
