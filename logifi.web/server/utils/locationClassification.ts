import { lookupAirportServer } from './airportLookupServer'
import { lookupNavaid } from './navaidLookup'

export type LocationKind = 'airport' | 'navaid' | 'unknown'

export interface ClassifiedLocation {
  code: string
  kind: LocationKind
  latitude?: number
  longitude?: number
  name?: string
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

/** Classify a route token: navaid index first, then airport DB. */
export function classifyLocationCode(code: string): ClassifiedLocation {
  const normalized = normalizeCode(code)
  if (!normalized || normalized.length < 3) {
    return { code: normalized, kind: 'unknown' }
  }

  const navaid = lookupNavaid(normalized)
  if (navaid) {
    return {
      code: normalized,
      kind: 'navaid',
      latitude: navaid.latitude,
      longitude: navaid.longitude,
      name: navaid.name
    }
  }

  const airport = lookupAirportServer(normalized)
  if (airport) {
    return {
      code: normalized,
      kind: 'airport',
      latitude: airport.latitude,
      longitude: airport.longitude,
      name: airport.name
    }
  }

  return { code: normalized, kind: 'unknown' }
}

export function classifyLocationCodes(codes: string[]): Record<string, LocationKind> {
  const results: Record<string, LocationKind> = {}
  const seen = new Set<string>()

  for (const code of codes) {
    const normalized = normalizeCode(code)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    results[normalized] = classifyLocationCode(normalized).kind
  }

  return results
}

/** Resolve coordinates for XC: navaid preferred, then airport. */
export function resolveLocationCoordinates(code: string): { latitude: number; longitude: number } | null {
  const classified = classifyLocationCode(code)
  if (classified.kind === 'unknown') return null
  if (classified.latitude == null || classified.longitude == null) return null
  return { latitude: classified.latitude, longitude: classified.longitude }
}
