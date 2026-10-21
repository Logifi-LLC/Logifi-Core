import type { AirportClientDb } from './airportDbCore'

export const AIRPORTS_CLIENT_URL = '/data/airports-client.json'

let database: AirportClientDb | null = null
let loadPromise: Promise<AirportClientDb> | null = null
let loadFailed = false

export class AirportClientDbLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AirportClientDbLoadError'
  }
}

export function isAirportClientDbLoaded(): boolean {
  return database !== null
}

export function getAirportClientDbIfLoaded(): AirportClientDb | null {
  return database
}

/**
 * Load trimmed airport catalog from public/data (after first paint). Memoized.
 */
export function ensureAirportClientDbLoaded(): Promise<AirportClientDb> {
  if (database) {
    return Promise.resolve(database)
  }

  if (loadFailed) {
    return Promise.reject(new AirportClientDbLoadError('Airport database failed to load'))
  }

  if (!loadPromise) {
    loadPromise = fetch(AIRPORTS_CLIENT_URL)
      .then(async (res) => {
        if (!res.ok) {
          throw new AirportClientDbLoadError(`Airport database not found (${res.status})`)
        }
        const parsed = (await res.json()) as AirportClientDb
        if (!parsed?.rows || !parsed?.iataToIcao) {
          throw new AirportClientDbLoadError('Airport database has invalid shape')
        }
        database = parsed
        return parsed
      })
      .catch((err) => {
        loadFailed = true
        loadPromise = null
        throw err instanceof AirportClientDbLoadError
          ? err
          : new AirportClientDbLoadError(
              err instanceof Error ? err.message : 'Failed to load airport database'
            )
      })
  }

  return loadPromise
}

/** Resolves when the client catalog has loaded (same promise as {@link ensureAirportClientDbLoaded}). */
export function airportClientDbReady(): Promise<AirportClientDb> {
  return ensureAirportClientDbLoaded()
}

/** Test helper: inject or clear the in-memory catalog without fetch. */
export function __setAirportClientDbForTests(db: AirportClientDb | null): void {
  database = db
  loadPromise = db ? Promise.resolve(db) : null
  loadFailed = false
}
