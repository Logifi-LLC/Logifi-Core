import {
  lookupAircraftLocal,
  AircraftDatabaseLoadError,
  isLegacyAircraftCacheEntry,
  type AircraftInfo,
} from '../../shared/aircraftLookupLocal'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'
import { DEVICE_GLOBAL_STORAGE_KEYS } from '~/utils/userScopedStorage'

export type { AircraftInfo }

const AIRCRAFT_CACHE_KEY = DEVICE_GLOBAL_STORAGE_KEYS.AIRCRAFT_CACHE
const CACHE_EXPIRY_DAYS = 30
const DETAILS_CACHE_EXPIRY_DAYS = 7

export function aircraftLookupApiPath(
  registration: string,
  options?: { refreshOwner?: boolean }
): string {
  const params = new URLSearchParams({ registration })
  if (options?.refreshOwner) params.set('refreshOwner', '1')
  return `/api/lookup-aircraft?${params.toString()}`
}

/**
 * Lookup aircraft information by registration number
 * Uses hybrid approach: local database first, then FAA inquiry fallback (web only)
 */
export const useAircraftLookup = () => {
  const getCachedAircraft = (registration: string, maxAgeDays = CACHE_EXPIRY_DAYS): AircraftInfo | null => {
    if (typeof window === 'undefined') return null

    try {
      const cache = JSON.parse(window.localStorage.getItem(AIRCRAFT_CACHE_KEY) || '{}')
      const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')
      const cached = cache[normalizedReg]

      if (cached && cached.lastUpdated && !isLegacyAircraftCacheEntry(cached)) {
        const cacheAge =
          (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
        if (cacheAge < maxAgeDays) {
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

  const fetchFromApi = async (
    registration: string,
    options?: { refreshOwner?: boolean }
  ): Promise<AircraftInfo | null> => {
    const response = await $fetch<{ success: boolean; data?: AircraftInfo; error?: string }>(
      aircraftLookupApiPath(registration, options)
    )

    if (response.success && response.data) {
      setCachedAircraft(registration, response.data)
      return response.data
    }
    if (response.error) {
      console.error('Aircraft API error:', response.error)
    }
    return null
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
      return await fetchFromApi(normalizedReg)
    } catch (error) {
      console.error('Aircraft lookup API call failed:', error)
      return null
    }
  }

  /**
   * Modal details lookup. May overlay a live FAA owner on web.
   * Category autofill must keep using lookupAircraft() so it does not scrape FAA.
   */
  const lookupAircraftDetails = async (registration: string): Promise<AircraftInfo | null> => {
    if (!registration || registration.trim().length === 0) {
      return null
    }

    const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')
    const cached = getCachedAircraft(normalizedReg, DETAILS_CACHE_EXPIRY_DAYS)
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
      return await fetchFromApi(normalizedReg, { refreshOwner: true })
    } catch (error) {
      console.error('Aircraft details lookup failed:', error)
      return lookupAircraft(normalizedReg)
    }
  }

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
    lookupAircraftDetails,
    lookupMultiple,
  }
}
