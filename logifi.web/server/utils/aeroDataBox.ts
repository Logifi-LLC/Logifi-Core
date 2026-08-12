import { getAeroDataBoxEnv } from './aeroDataBoxEnv'

export interface AeroDataBoxActuals {
  registration: string | null
  aircraftType: string | null
  actualOutLocal: string | null
  actualInLocal: string | null
  actualOffLocal: string | null
  actualOnLocal: string | null
}

interface AeroAirport {
  iata?: string
  icao?: string
}

interface AeroMovement {
  airport?: AeroAirport
  scheduledTimeLocal?: string
  actualTimeLocal?: string
  actualRunwayLocal?: string
  estimatedTimeLocal?: string
}

interface AeroFlightRecord {
  number?: string
  departure?: AeroMovement
  arrival?: AeroMovement
  aircraft?: {
    reg?: string
    model?: string
    modelCode?: string
  }
}

function normalizeAirportCode(code: string | undefined): string {
  if (!code) return ''
  const c = code.trim().toUpperCase()
  if (c.length === 4 && c.startsWith('K') && /^K[A-Z]{3}$/.test(c)) {
    return c.slice(1)
  }
  return c.length === 3 ? c : c
}

function airportsMatch(
  recordDep: string | undefined,
  recordArr: string | undefined,
  legDep?: string,
  legArr?: string
): boolean {
  if (!legDep && !legArr) return true
  const rd = normalizeAirportCode(recordDep)
  const ra = normalizeAirportCode(recordArr)
  const ld = normalizeAirportCode(legDep)
  const la = normalizeAirportCode(legArr)
  if (ld && rd && ld !== rd) return false
  if (la && ra && la !== ra) return false
  return Boolean((ld && rd) || (la && ra))
}

function pickLocalTime(movement: AeroMovement | undefined, keys: Array<keyof AeroMovement>): string | null {
  if (!movement) return null
  for (const key of keys) {
    const v = movement[key]
    if (typeof v === 'string' && v.trim().length >= 10) return v.trim()
  }
  return null
}

function extractActuals(record: AeroFlightRecord): AeroDataBoxActuals {
  const dep = record.departure
  const arr = record.arrival
  const aircraft = record.aircraft

  return {
    registration:
      typeof aircraft?.reg === 'string' && aircraft.reg.trim() ? aircraft.reg.trim() : null,
    aircraftType:
      (typeof aircraft?.modelCode === 'string' && aircraft.modelCode.trim()) ||
      (typeof aircraft?.model === 'string' && aircraft.model.trim()) ||
      null,
    actualOutLocal: pickLocalTime(dep, ['actualTimeLocal', 'estimatedTimeLocal', 'scheduledTimeLocal']),
    actualInLocal: pickLocalTime(arr, ['actualTimeLocal', 'estimatedTimeLocal', 'scheduledTimeLocal']),
    actualOffLocal: pickLocalTime(dep, ['actualRunwayLocal']),
    actualOnLocal: pickLocalTime(arr, ['actualRunwayLocal']),
  }
}

function selectMatchingFlight(
  records: AeroFlightRecord[],
  depIcao?: string,
  arrIcao?: string
): AeroFlightRecord | null {
  if (!records.length) return null
  if (records.length === 1) return records[0]

  const dep = depIcao?.trim()
  const arr = arrIcao?.trim()
  if (dep || arr) {
    const matched = records.filter((r) =>
      airportsMatch(
        r.departure?.airport?.iata ?? r.departure?.airport?.icao,
        r.arrival?.airport?.iata ?? r.arrival?.airport?.icao,
        dep,
        arr
      )
    )
    if (matched.length === 1) return matched[0]
    if (matched.length > 1) return matched[0]
  }

  return records[0]
}

/**
 * Fetch gate/runway actuals and tail from AeroDataBox by flight number + date.
 * Returns null on missing config, 404, rate limits, or no route match — never throws.
 */
export async function fetchFlightActuals(
  flightNumber: string,
  dateYYYYMMDD: string,
  depIcao?: string,
  arrIcao?: string
): Promise<AeroDataBoxActuals | null> {
  const num = flightNumber.trim()
  const date = dateYYYYMMDD.trim()
  if (!num || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const { apiKey, apiHost } = getAeroDataBoxEnv()
  if (!apiKey) return null

  const encodedNum = encodeURIComponent(num)
  const url = `https://${apiHost}/flights/number/${encodedNum}/${date}`

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
        Accept: 'application/json',
      },
    })

    if (res.status === 404 || res.status === 204) return null
    if (res.status === 429 || res.status >= 500) return null
    if (!res.ok) return null

    const data = (await res.json()) as AeroFlightRecord[] | { flights?: AeroFlightRecord[] }
    const records = Array.isArray(data) ? data : (data?.flights ?? [])
    if (!records.length) return null

    const match = selectMatchingFlight(records, depIcao, arrIcao)
    if (!match) return null

    if (depIcao || arrIcao) {
      const dep = match.departure?.airport?.iata ?? match.departure?.airport?.icao
      const arr = match.arrival?.airport?.iata ?? match.arrival?.airport?.icao
      if (!airportsMatch(dep, arr, depIcao, arrIcao)) return null
    }

    return extractActuals(match)
  } catch {
    return null
  }
}
