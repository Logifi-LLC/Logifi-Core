/**
 * Airport Lookup API
 * 
 * Queries airport information by ICAO/IATA/FAA code
 * Uses static airport database for instant, offline lookups
 * Coordinate overrides fix known wrong data from the package (e.g. KMCX resolving to MCX Russia)
 */

import { lookupAirportServer } from '../utils/airportLookupServer'

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
    const result = lookupAirportServer(normalizedCode)
    if (result) {
      return {
        success: true,
        data: {
          ...result,
          locationKind: 'airport' as const
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
