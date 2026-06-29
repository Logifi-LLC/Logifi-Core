const LOCATION_CACHE_KEY = 'logifi://location-coords-cache'
const CACHE_EXPIRY_DAYS = 30

export type LocationKind = 'airport' | 'navaid' | 'unknown'

export interface LocationCoords {
  latitude: number
  longitude: number
  kind: LocationKind
  name?: string
}

function getCachedLocation(code: string): LocationCoords | null {
  if (typeof window === 'undefined') return null
  try {
    const cache = JSON.parse(window.localStorage.getItem(LOCATION_CACHE_KEY) || '{}')
    const normalized = code.trim().toUpperCase().replace(/\s+/g, '')
    const cached = cache[normalized]
    if (cached?.lastUpdated) {
      const age = (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
      if (age < CACHE_EXPIRY_DAYS && cached.latitude != null && cached.longitude != null) {
        return {
          latitude: cached.latitude,
          longitude: cached.longitude,
          kind: cached.kind ?? 'airport',
          name: cached.name
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

function setCachedLocation(code: string, data: LocationCoords): void {
  if (typeof window === 'undefined') return
  try {
    const cache = JSON.parse(window.localStorage.getItem(LOCATION_CACHE_KEY) || '{}')
    const normalized = code.trim().toUpperCase().replace(/\s+/g, '')
    cache[normalized] = { ...data, lastUpdated: new Date().toISOString() }
    window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

/** Resolve navaid or airport coordinates (navaid index checked first on server). */
export const useLocationLookup = () => {
  const lookupLocationCoords = async (code: string): Promise<LocationCoords | null> => {
    if (!code?.trim()) return null
    const normalized = code.trim().toUpperCase().replace(/\s+/g, '')
    if (normalized.length < 3) return null

    const cached = getCachedLocation(normalized)
    if (cached) return cached

    try {
      const response = await $fetch<{
        success: boolean
        data?: { kind: LocationKind; latitude?: number; longitude?: number; name?: string }
      }>(`/api/lookup-location?code=${encodeURIComponent(normalized)}`)

      if (
        response.success &&
        response.data &&
        response.data.kind !== 'unknown' &&
        response.data.latitude != null &&
        response.data.longitude != null
      ) {
        const result: LocationCoords = {
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          kind: response.data.kind,
          name: response.data.name
        }
        setCachedLocation(normalized, result)
        return result
      }
    } catch (error) {
      console.warn('Location lookup failed:', normalized, error)
    }

    return null
  }

  const getLocationCoordsFromCache = (code: string): { lat: number; lon: number } | null => {
    const cached = getCachedLocation(code)
    if (!cached) return null
    return { lat: cached.latitude, lon: cached.longitude }
  }

  return {
    lookupLocationCoords,
    getLocationCoordsFromCache
  }
}
