export interface AirportInfo {
  code: string
  icao?: string
  iata?: string
  name?: string
  city?: string
  state?: string
  country?: string
  elevation?: string
  latitude?: number
  longitude?: number
  timezone?: string
  source?: string
}

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
        lastUpdated: new Date().toISOString()
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

    // Normalize code (remove spaces, ensure uppercase)
    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')

    // Validate airport code format (3-4 characters) before making API call
    if (normalizedCode.length < 3 || normalizedCode.length > 4) {
      // Silently return null for invalid codes - don't log as error since this might be expected
      return null
    }

    // Check cache first
    const cached = getCachedAirport(normalizedCode)
    if (cached) {
      return cached
    }

    // Lookup via server-side API (uses static airport database)
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
        // Only log as error if it's not a format validation error (which we already handled)
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
    lookupAirport
  }
}
