import {
  lookupAircraftLocal,
  AircraftDatabaseLoadError,
  type AircraftInfo,
} from '../../shared/aircraftLookupLocal'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

export type { AircraftInfo }

const AIRCRAFT_CACHE_KEY = 'logifi://aircraft-cache'
const CACHE_EXPIRY_DAYS = 30

/**
 * Lookup aircraft information by registration number
 * Uses hybrid approach: local database first, then FAA API fallback (web only)
 */
export const useAircraftLookup = () => {
  const getCachedAircraft = (registration: string): AircraftInfo | null => {
    if (typeof window === 'undefined') return null

    try {
      const cache = JSON.parse(window.localStorage.getItem(AIRCRAFT_CACHE_KEY) || '{}')
      const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')
      const cached = cache[normalizedReg]

      if (cached && cached.lastUpdated) {
        const cacheAge = (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
        if (cacheAge < CACHE_EXPIRY_DAYS) {
          console.log('Using cached aircraft data:', cached.source)
          return cached
        }
      }
    } catch (error) {
      console.warn('Failed to read aircraft cache:', error)
    }

    return null
  }

  const setCachedAircraft = (registration: string, info: AircraftInfo) => {
    if (typeof window === 'undefined') return

    try {
      const cache = JSON.parse(window.localStorage.getItem(AIRCRAFT_CACHE_KEY) || '{}')
      const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')
      cache[normalizedReg] = {
        ...info,
        lastUpdated: new Date().toISOString(),
      }
      window.localStorage.setItem(AIRCRAFT_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache aircraft data:', error)
    }
  }

  const lookupAircraft = async (registration: string): Promise<AircraftInfo | null> => {
    if (!registration || registration.trim().length === 0) {
      return null
    }

    const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')

    const cached = getCachedAircraft(normalizedReg)
    if (cached) {
      return cached
    }

    if (isCapacitorNative()) {
      const info = await lookupAircraftLocal(normalizedReg)
      if (info) {
        setCachedAircraft(normalizedReg, info)
      }
      return info
    }

    try {
      console.log('Calling aircraft lookup API for:', normalizedReg)
      const response = await $fetch<{ success: boolean; data?: AircraftInfo; error?: string }>(
        `/api/lookup-aircraft?registration=${encodeURIComponent(normalizedReg)}`
      )

      console.log('Aircraft API response:', response)

      if (response.success && response.data) {
        setCachedAircraft(normalizedReg, response.data)
        return response.data
      } else if (response.error) {
        console.error('Aircraft API error:', response.error)
      }
    } catch (error) {
      console.error('Aircraft lookup API call failed:', error)
    }

    return null
  }

  /**
   * Batch lookup multiple aircraft registrations
   * Useful for processing entire logbooks
   */
  const lookupMultiple = async (registrations: string[]): Promise<Map<string, AircraftInfo>> => {
    const results = new Map<string, AircraftInfo>()
    const uniqueRegs = [...new Set(registrations.filter(Boolean))]

    for (const reg of uniqueRegs) {
      try {
        const info = await lookupAircraft(reg)
        if (info) {
          const normalizedReg = reg.trim().toUpperCase().replace(/[-\s]/g, '')
          results.set(normalizedReg, info)
        }
      } catch (error) {
        if (error instanceof AircraftDatabaseLoadError) {
          throw error
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    return results
  }

  return {
    lookupAircraft,
    lookupMultiple,
  }
}
