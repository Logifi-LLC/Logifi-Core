export interface AircraftInfo {
  registration: string
  make?: string
  model?: string
  year?: string
  owner?: string
  engineType?: string
  category?: string
  city?: string
  state?: string
  serialNumber?: string
  airworthinessDate?: string
  source?: string
}

const AIRCRAFT_CACHE_KEY = 'logifi://aircraft-cache'
const CACHE_EXPIRY_DAYS = 30

/**
 * Lookup aircraft information by registration number
 * Uses hybrid approach: local database first, then FAA API fallback
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
        lastUpdated: new Date().toISOString()
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

    // Normalize registration (remove spaces/dashes, ensure uppercase)
    const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')

    // Check cache first
    const cached = getCachedAircraft(normalizedReg)
    if (cached) {
      return cached
    }

    // Lookup via server-side API (hybrid: local DB + FAA fallback)
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

    // Lookup with a small delay between requests to respect rate limits
    for (const reg of uniqueRegs) {
      const info = await lookupAircraft(reg)
      if (info) {
        const normalizedReg = reg.trim().toUpperCase().replace(/[-\s]/g, '')
        results.set(normalizedReg, info)
      }
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  return {
    lookupAircraft,
    lookupMultiple
  }
}
