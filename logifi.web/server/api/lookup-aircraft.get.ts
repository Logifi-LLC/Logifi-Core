/**
 * Aircraft Registration Lookup API (Hybrid Approach)
 *
 * 1. Checks local static database first (instant, offline)
 * 2. Optionally overlays live FAA owner when refreshOwner=1 (modal only)
 * 3. Falls back to live FAA inquiry for N-numbers missing from the snapshot
 *
 * Update static DB monthly with: npm run update-aircraft-db
 */

import { readFileSync, statSync } from 'fs'
import { join } from 'path'
import type { AircraftInfo } from '../../shared/aircraftLookupLocal'
import {
  lookupAircraftRegistration,
  parseFaaRegistryHtml,
  type AircraftDatabaseMeta,
} from '../utils/aircraftRegistryLookup'

let aircraftDatabase: Record<string, Partial<AircraftInfo>> | null = null
let aircraftMeta: AircraftDatabaseMeta | null = null
let databaseMtimeMs = 0
let metaMtimeMs = 0

function dataPath(fileName: string) {
  return join(process.cwd(), 'server/data', fileName)
}

function loadDatabase() {
  const dbPath = dataPath('aircraft-database.json')
  try {
    const mtimeMs = statSync(dbPath).mtimeMs
    if (aircraftDatabase && mtimeMs === databaseMtimeMs) {
      return aircraftDatabase
    }
    console.log('Loading aircraft database from filesystem...')
    aircraftDatabase = JSON.parse(readFileSync(dbPath, 'utf-8'))
    databaseMtimeMs = mtimeMs
    const count = aircraftDatabase ? Object.keys(aircraftDatabase).length : 0
    console.log(`Loaded ${count.toLocaleString()} aircraft from local database`)
  } catch {
    console.warn('Aircraft database not found. Run: node scripts/download-faa-aircraft.js')
    console.warn('    Will use FAA inquiry only (slower, requires internet)')
    aircraftDatabase = {}
    databaseMtimeMs = 0
  }

  return aircraftDatabase
}

function loadMeta(): AircraftDatabaseMeta | null {
  const metaPath = dataPath('aircraft-database-meta.json')
  try {
    const mtimeMs = statSync(metaPath).mtimeMs
    if (aircraftMeta && mtimeMs === metaMtimeMs) {
      return aircraftMeta
    }
    aircraftMeta = JSON.parse(readFileSync(metaPath, 'utf-8')) as AircraftDatabaseMeta
    metaMtimeMs = mtimeMs
  } catch {
    aircraftMeta = null
    metaMtimeMs = 0
  }

  return aircraftMeta
}

async function queryFAARegistry(registration: string): Promise<Partial<AircraftInfo> | null> {
  try {
    const faaUrl = 'https://registry.faa.gov/aircraftinquiry/Search/NNumberResult'

    console.log(`Querying FAA Registry for: ${registration}`)

    const response = await $fetch(faaUrl, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://registry.faa.gov',
        Referer: 'https://registry.faa.gov/aircraftinquiry/',
      },
      body: new URLSearchParams({
        NNumbertxt: registration,
      }).toString(),
      timeout: 15000,
    }).catch((error) => {
      console.warn('FAA inquiry request failed:', error?.message)
      return null
    })

    if (!response || typeof response !== 'string') {
      return null
    }

    if (
      response.includes('No records found') ||
      response.includes('not found') ||
      response.includes('No matching records') ||
      response.includes('Invalid N-Number') ||
      response.includes('No aircraft found')
    ) {
      console.log('Aircraft not found in FAA Registry')
      return null
    }

    return parseFaaRegistryHtml(response, registration)
  } catch (error) {
    console.warn('FAA inquiry error:', error)
    return null
  }
}

function isRefreshOwnerFlag(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isRefreshOwnerFlag)
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes'
  }
  return false
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const registration = query.registration as string
  const refreshOwner = isRefreshOwnerFlag(query.refreshOwner)

  try {
    return await lookupAircraftRegistration(
      registration || '',
      { refreshOwner },
      {
        loadDatabase,
        loadMeta,
        queryLiveRegistry: queryFAARegistry,
      }
    )
  } catch (error) {
    console.error('Aircraft lookup error:', error)
    return {
      success: false,
      error: 'Failed to lookup aircraft information',
    }
  }
})
