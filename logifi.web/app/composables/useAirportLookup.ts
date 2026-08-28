import { lookupAirportLocal, type AirportInfo } from '../../shared/airportLookup'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

export type { AirportInfo }

const AIRPORT_CACHE_KEY = 'logifi://airport-cache'
const CACHE_EXPIRY_DAYS = 30

/** In-memory cache so import does not JSON.parse localStorage per code. */
const memoryCache = new Map<string, AirportInfo>()

function normalizeAirportCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Lookup airport information by ICAO/IATA/FAA code.
 * Prefers the bundled static DB; only hits the API for codes missing locally (US supplement).
 */
export const useAirportLookup = () => {
  const getCachedAirport = (code: string): AirportInfo | null => {
    const normalizedCode = normalizeAirportCode(code)
    const mem = memoryCache.get(normalizedCode)
    if (mem) return mem

    if (typeof window === 'undefined') return null

    try {
      const cache = JSON.parse(window.localStorage.getItem(AIRPORT_CACHE_KEY) || '{}')
      const cached = cache[normalizedCode]

      if (cached && cached.lastUpdated) {
        const cacheAge =
          (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
        if (cacheAge < CACHE_EXPIRY_DAYS && cached.source) {
          memoryCache.set(normalizedCode, cached)
          return cached
        }
      }
    } catch (error) {
      console.warn('Failed to read airport cache:', error)
    }

    return null
  }

  const setCachedAirport = (code: string, info: AirportInfo) => {
    const normalizedCode = normalizeAirportCode(code)
    memoryCache.set(normalizedCode, info)

    if (typeof window === 'undefined') return

    try {
      const cache = JSON.parse(window.localStorage.getItem(AIRPORT_CACHE_KEY) || '{}')
      cache[normalizedCode] = {
        ...info,
        lastUpdated: new Date().toISOString(),
      }
      window.localStorage.setItem(AIRPORT_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache airport data:', error)
    }
  }

  const lookupAirport = async (code: string): Promise<AirportInfo | null> => {
    if (!code || code.trim().length === 0) {
      return null
    }

    const normalizedCode = normalizeAirportCode(code)

    if (normalizedCode.length < 3 || normalizedCode.length > 4) {
      return null
    }

    const cached = getCachedAirport(normalizedCode)
    if (cached) {
      return cached
    }

    const local = lookupAirportLocal(normalizedCode)
    if (local) {
      setCachedAirport(normalizedCode, local)
      return local
    }

    if (isCapacitorNative()) {
      return null
    }

    try {
      const response = await $fetch<{ success: boolean; data?: AirportInfo; error?: string }>(
        `/api/lookup-airport?code=${encodeURIComponent(normalizedCode)}`
      )

      if (response.success && response.data) {
        setCachedAirport(normalizedCode, response.data)
        return response.data
      } else if (response.error) {
        if (!response.error.includes('Invalid airport code format')) {
          console.error('Airport API error:', response.error)
        }
      }
    } catch (error) {
      console.error('Airport lookup API call failed:', error)
    }

    return null
  }

  return {
    lookupAirport,
  }
}

/** Test helper: clear in-memory airport cache between tests. */
export function __resetAirportLookupMemoryCacheForTests(): void {
  memoryCache.clear()
}
