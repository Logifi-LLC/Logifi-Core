/**
 * Aircraft Registration Lookup API (Hybrid Approach)
 * 
 * 1. Checks local static database first (instant, offline) - ~200K+ aircraft
 * 2. Falls back to live FAA API for very recent registrations (last 30 days)
 * 
 * Benefits:
 * - 99.9% of lookups are instant and offline
 * - Always up-to-date for brand new registrations
 * - Update static DB monthly with: npm run update-aircraft-db
 */

// Static database will be lazy-loaded from filesystem
import { readFileSync } from 'fs'
import { join } from 'path'

let aircraftDatabase: Record<string, any> | null = null
let databaseLoadAttempted = false

function loadDatabase() {
  if (databaseLoadAttempted) {
    return aircraftDatabase
  }
  
  databaseLoadAttempted = true
  
  try {
    console.log('Loading aircraft database from filesystem...')
    // Read from filesystem instead of importing (to avoid memory issues during build)
    const dbPath = join(process.cwd(), 'server/data/aircraft-database.json')
    const dbContent = readFileSync(dbPath, 'utf-8')
    aircraftDatabase = JSON.parse(dbContent)
    const count = aircraftDatabase ? Object.keys(aircraftDatabase).length : 0
    console.log(`✅ Loaded ${count.toLocaleString()} aircraft from local database`)
  } catch (error) {
    console.warn('⚠️  Aircraft database not found. Run: node scripts/download-faa-aircraft.js')
    console.warn('    Will use FAA API only (slower, requires internet)')
    aircraftDatabase = {}
  }
  
  return aircraftDatabase
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const registration = query.registration as string

  if (!registration || registration.trim().length === 0) {
    return { success: false, error: 'Registration number is required' }
  }

  const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')

  // Validate N-number format (US registrations start with N)
  if (!normalizedReg.startsWith('N') || normalizedReg.length < 3) {
    return { success: false, error: 'Invalid registration format. US registrations must start with N.' }
  }

  try {
    // 1. Try local database first (instant lookup, offline)
    const db = loadDatabase()
    const localResult = db?.[normalizedReg]
    
    if (localResult) {
      console.log(`✅ Found ${normalizedReg} in local database`)
      return {
        success: true,
        data: {
          ...localResult,
          source: 'Local Database (FAA)'
        }
      }
    }

    console.log(`⚠️  ${normalizedReg} not in local database, querying live FAA API...`)

    // 2. Fall back to live FAA API (for very recent registrations)
    const faaResult = await queryFAARegistry(normalizedReg)
    
    if (faaResult) {
      console.log(`✅ Found ${normalizedReg} via live FAA API`)
      return {
        success: true,
        data: {
          ...faaResult,
          source: 'FAA API (Recent Registration)'
        }
      }
    }

    return { 
      success: false, 
      error: 'Aircraft not found in database or FAA registry' 
    }
  } catch (error) {
    console.error('Aircraft lookup error:', error)
    return {
      success: false,
      error: 'Failed to lookup aircraft information'
    }
  }
})

/**
 * Query live FAA Registry (fallback for recent registrations)
 * This is slower but ensures we can find brand new aircraft
 */
async function queryFAARegistry(registration: string) {
  try {
    const faaUrl = 'https://registry.faa.gov/aircraftinquiry/Search/NNumberResult'
    
    console.log(`Querying FAA Registry API for: ${registration}`)
    
    const response = await $fetch(faaUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://registry.faa.gov',
        'Referer': 'https://registry.faa.gov/aircraftinquiry/',
      },
      body: new URLSearchParams({
        'NNumbertxt': registration
      }).toString(),
      timeout: 15000
    }).catch((error) => {
      console.warn('FAA API request failed:', error?.message)
      return null
    })

    if (!response || typeof response !== 'string') {
      return null
    }

    // Check if aircraft not found
    if (response.includes('No records found') || 
        response.includes('not found') || 
        response.includes('No matching records') ||
        response.includes('Invalid N-Number') ||
        response.includes('No aircraft found')) {
      console.log('Aircraft not found in FAA Registry')
      return null
    }

    return parseFAAResponse(response, registration)
  } catch (error) {
    console.warn('FAA API query error:', error)
    return null
  }
}

/**
 * Parse FAA Registry HTML response
 * Extracts aircraft information from the HTML table structure
 */
function parseFAAResponse(html: string, registration: string) {
  try {
    const extractValue = (label: string): string | null => {
      const patterns = [
        new RegExp(`<td[^>]*>\\s*${label}\\s*</td>\\s*<td[^>]*>([^<]+)</td>`, 'i'),
        new RegExp(`<th[^>]*>\\s*${label}\\s*</th>\\s*<td[^>]*>([^<]+)</td>`, 'i'),
      ]
      
      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          const value = match[1].trim()
          if (value && value.length > 0 && !value.match(/^[\s\-]+$/)) {
            return value
          }
        }
      }
      return null
    }
    
    const make = extractValue('Manufacturer Name') || extractValue('Mfr Name') || extractValue('Manufacturer')
    const model = extractValue('Model') || extractValue('Model Name')
    const year = extractValue('Year') || extractValue('Mfr Year') || extractValue('Year Mfr')
    const engineType = extractValue('Engine Model') || extractValue('Engine') || extractValue('Engine Type')
    const category = extractValue('Aircraft Category') || extractValue('Type Aircraft') || extractValue('Category')
    const owner = extractValue('Owner Name') || extractValue('Registered Owner') || extractValue('Owner')
    const city = extractValue('City')
    const state = extractValue('State')

    // Only return data if we found at least manufacturer or model
    if (make || model || year) {
      return {
        registration,
        make: make || undefined,
        model: model || undefined,
        year: year || undefined,
        engineType: engineType || undefined,
        category: category || undefined,
        owner: owner || undefined,
        city: city || undefined,
        state: state || undefined,
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing FAA response:', error)
    return null
  }
}
