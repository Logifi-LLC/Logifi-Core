/**
 * Airport Lookup API
 * 
 * Queries airport information by ICAO/IATA/FAA code
 * Uses static airport database for instant, offline lookups
 */

import { airports } from '@nwpr/airport-codes'

interface Airport {
  icao?: string
  iata?: string
  name?: string
  city?: string
  state?: string
  country?: string
  elevation?: number
  latitude?: number
  longitude?: number
  timezone?: string
}

export default defineEventHandler(async (event): Promise<{ success: boolean; data?: any; error?: string }> => {
  const query = getQuery(event)
  const airportCode = query.code as string

  if (!airportCode || airportCode.trim().length === 0) {
    return { success: false, error: 'Airport code is required' }
  }

  const normalizedCode = airportCode.trim().toUpperCase().replace(/\s+/g, '')

  // Validate airport code format (3-4 characters, alphanumeric)
  if (normalizedCode.length < 3 || normalizedCode.length > 4) {
    return { success: false, error: 'Invalid airport code format. Must be 3-4 characters.' }
  }

  try {
    // Try ICAO lookup first (4 characters)
    let airport: Airport | undefined = undefined
    
    if (normalizedCode.length === 4) {
      airport = airports.find(a => a.icao === normalizedCode)
    }
    
    // Try IATA lookup (3 characters) if ICAO failed
    if (!airport && normalizedCode.length === 3) {
      airport = airports.find(a => a.iata === normalizedCode)
    }
    
    // If still not found and it's 4 chars, try as FAA code by searching IATA
    if (!airport && normalizedCode.length === 4) {
      // Some US airports use FAA codes that match their IATA
      const iataCode = normalizedCode.substring(1) // Try last 3 chars
      airport = airports.find(a => a.iata === iataCode)
    }

    if (airport) {
      return {
        success: true,
        data: {
          code: normalizedCode,
          icao: airport.icao || undefined,
          iata: airport.iata || undefined,
          name: airport.name || `${normalizedCode} Airport`,
          city: airport.city || undefined,
          state: airport.state || undefined,
          country: airport.country || undefined,
          elevation: airport.elevation ? `${airport.elevation} ft` : undefined,
          latitude: airport.latitude ? Number(airport.latitude) : undefined,
          longitude: airport.longitude ? Number(airport.longitude) : undefined,
          timezone: airport.timezone || undefined,
          source: 'Static Airport Database'
        }
      }
    }

    return { success: false, error: 'Airport not found' }
  } catch (error) {
    console.error('Airport lookup error:', error)
    return {
      success: false,
      error: 'Failed to lookup airport information'
    }
  }
})
