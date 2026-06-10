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

const DB_URL = '/data/aircraft-database.json'

let database: Record<string, Omit<AircraftInfo, 'registration' | 'source'>> | null = null
let loadPromise: Promise<Record<string, Omit<AircraftInfo, 'registration' | 'source'>>> | null = null
let loadFailed = false

async function loadDatabase(): Promise<Record<string, Omit<AircraftInfo, 'registration' | 'source'>>> {
  if (database) {
    return database
  }

  if (loadFailed) {
    throw new Error('Aircraft database failed to load')
  }

  if (!loadPromise) {
    loadPromise = fetch(DB_URL)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Aircraft database not found (${res.status})`)
        }
        return res.json() as Promise<Record<string, Omit<AircraftInfo, 'registration' | 'source'>>>
      })
      .then((db) => {
        database = db
        return db
      })
      .catch((err) => {
        loadFailed = true
        loadPromise = null
        throw err
      })
  }

  return loadPromise
}

export class AircraftDatabaseLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AircraftDatabaseLoadError'
  }
}

/**
 * FAA DB keys are stored without the leading N (e.g. "653PA"); callers pass "N653PA".
 */
export function resolveDbRegistrationKey(
  normalizedReg: string,
  db: Record<string, unknown>
): string | null {
  if (db[normalizedReg]) return normalizedReg
  if (normalizedReg.startsWith('N')) {
    const withoutN = normalizedReg.slice(1)
    if (db[withoutN]) return withoutN
  } else if (db[`N${normalizedReg}`]) {
    return `N${normalizedReg}`
  }
  return null
}

/**
 * Offline aircraft lookup from bundled FAA database (copied to public/data at iOS build time).
 */
export async function lookupAircraftLocal(registration: string): Promise<AircraftInfo | null> {
  if (!registration || registration.trim().length === 0) {
    return null
  }

  const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')

  if (!normalizedReg.startsWith('N') || normalizedReg.length < 3) {
    return null
  }

  try {
    const db = await loadDatabase()
    const dbKey = resolveDbRegistrationKey(normalizedReg, db)
    const localResult = dbKey ? db[dbKey] : undefined

    if (localResult) {
      return {
        ...localResult,
        registration: normalizedReg,
        source: 'Local Database (FAA)',
      }
    }
  } catch (err) {
    throw new AircraftDatabaseLoadError(
      err instanceof Error ? err.message : 'Failed to load aircraft database'
    )
  }

  return null
}
