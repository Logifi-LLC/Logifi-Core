import supplementJson from '../data/us-airport-supplement.json' with { type: 'json' }

export interface SupplementAirport {
  icao: string
  iata?: string
  faa?: string
  name: string
  city?: string
  state?: string
  country: string
  latitude: number
  longitude: number
}

const supplementByIcao = supplementJson as Record<string, SupplementAirport>
const supplementByFaa = new Map<string, SupplementAirport>()
const supplementByIata = new Map<string, SupplementAirport>()

for (const entry of Object.values(supplementByIcao)) {
  if (entry.faa) supplementByFaa.set(entry.faa.toUpperCase(), entry)
  if (entry.iata) supplementByIata.set(entry.iata.toUpperCase(), entry)
}

/** Lookup US GA airports missing from @nwpr/airport-codes (OurAirports supplement). */
export function lookupSupplementAirport(code: string): SupplementAirport | null {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '')
  if (!normalized) return null

  const byIcao = supplementByIcao[normalized]
  if (byIcao) return byIcao

  if (normalized.length === 3) {
    return supplementByFaa.get(normalized) ?? supplementByIata.get(normalized) ?? null
  }

  if (normalized.length === 4 && normalized.startsWith('K')) {
    return supplementByFaa.get(normalized.slice(1)) ?? null
  }

  return null
}

export function supplementAirportToResponse(entry: SupplementAirport, requestedCode: string) {
  return {
    code: requestedCode,
    icao: entry.icao,
    iata: entry.iata,
    name: entry.name,
    city: entry.city,
    state: entry.state,
    country: entry.country,
    latitude: entry.latitude,
    longitude: entry.longitude,
    source: 'US Airport Supplement (OurAirports)'
  }
}
