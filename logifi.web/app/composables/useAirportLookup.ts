import { lookupAirportLocal, type AirportInfo } from '../../shared/airportLookup'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

export type { AirportInfo }

const AIRPORT_CACHE_KEY = 'logifi://airport-cache'
const CACHE_EXPIRY_DAYS = 30

/**
 * Lookup airport information by ICAO/IATA/FAA code
 */
export const useAirportLookup = () => {
  const getCachedAirport = (code: string): AirportInfo | null => {
    if (typeof window === 'undefined') return null

    try {
      const cache = JSON.parse(window.localStorage.getItem(AIRPORT_CACHE_KEY) || '{}')
      const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
      const cached = cache[normalizedCode]

      if (cached && cached.lastUpdated) {
        const cacheAge = (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
        if (cacheAge < CACHE_EXPIRY_DAYS && cached.source) {
          console.log('Using cached airport data:', cached.source)
          return cached
        }
      }
    } catch (error) {
      console.warn('Failed to read airport cache:', error)
    }

    return null
  }

  const setCachedAirport = (code: string, info: AirportInfo) => {
    if (typeof window === 'undefined') return

    try {
      const cache = JSON.parse(window.localStorage.getItem(AIRPORT_CACHE_KEY) || '{}')
      const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
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

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')

    if (normalizedCode.length < 3 || normalizedCode.length > 4) {
      return null
    }

    const cached = getCachedAirport(normalizedCode)
    if (cached) {
      return cached
    }

    if (isCapacitorNative()) {
      const info = lookupAirportLocal(normalizedCode)
      if (info) {
        setCachedAirport(normalizedCode, info)
      }
      return info
    }

    try {
      console.log('Calling airport lookup API for:', normalizedCode)
      const response = await $fetch<{ success: boolean; data?: AirportInfo; error?: string }>(
        `/api/lookup-airport?code=${encodeURIComponent(normalizedCode)}`
      )

      console.log('Airport API response:', response)

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
