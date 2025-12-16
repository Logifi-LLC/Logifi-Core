/**
 * Airport Lookup API
 * 
 * Queries airport information by ICAO/IATA/FAA code
 * Uses static airport database for instant, offline lookups
 */

import AirportCodes from 'airport-codes'

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
    let airport = null
    
    if (normalizedCode.length === 4) {
      airport = AirportCodes.findWhere({ icao: normalizedCode })
    }
    
    // Try IATA lookup (3 characters) if ICAO failed
    if (!airport && normalizedCode.length === 3) {
      airport = AirportCodes.findWhere({ iata: normalizedCode })
    }
    
    // If still not found and it's 4 chars, try as FAA code by searching IATA
    if (!airport && normalizedCode.length === 4) {
      // Some US airports use FAA codes that match their IATA
      const iataCode = normalizedCode.substring(1) // Try last 3 chars
      airport = AirportCodes.findWhere({ iata: iataCode })
    }

    if (airport) {
      const airportData = airport.toJSON()
      
      return {
        success: true,
        data: {
          code: normalizedCode,
          icao: airportData.icao || undefined,
          iata: airportData.iata || undefined,
          name: airportData.name || `${normalizedCode} Airport`,
          city: airportData.city || undefined,
          state: airportData.state || undefined,
          country: airportData.country || undefined,
          elevation: airportData.elevation ? `${airportData.elevation} ft` : undefined,
          latitude: airportData.latitude ? Number(airportData.latitude) : undefined,
          longitude: airportData.longitude ? Number(airportData.longitude) : undefined,
          timezone: airportData.timezone || undefined,
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
