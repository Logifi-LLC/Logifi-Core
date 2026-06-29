/** Persisted FFS / FTD / ATD mapping per simulator device family (aircraft make/model). */

export type SimTypeKey = 'FFS' | 'FTD' | 'ATD'

const STORAGE_KEY = 'logifi://sim-device-catalog'

let catalogCache: Record<string, SimTypeKey> = {}

/** Canonical key for catalog lookups — uppercase, normalized whitespace. */
export function simDeviceFamilyKey(makeModel: string): string {
  return makeModel.toUpperCase().replace(/\s+/g, ' ').trim()
}

function persistToStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogCache))
  } catch {
    // ignore quota errors
  }
}

export function loadSimDeviceCatalogFromStorage(): Record<string, SimTypeKey> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, SimTypeKey>
      catalogCache = { ...parsed }
    }
  } catch {
    catalogCache = {}
  }
  return { ...catalogCache }
}

export function mergeSimDeviceCatalog(from: Record<string, SimTypeKey>): void {
  catalogCache = { ...catalogCache, ...from }
  persistToStorage()
}

export function getSimDeviceCatalogSnapshot(): Record<string, SimTypeKey> {
  return { ...catalogCache }
}

export function getCatalogSimDeviceType(makeModel: string): SimTypeKey | null {
  const key = simDeviceFamilyKey(makeModel)
  return catalogCache[key] ?? null
}

export function setCatalogSimDeviceType(makeModel: string, type: SimTypeKey | null): void {
  const key = simDeviceFamilyKey(makeModel)
  if (type) {
    catalogCache[key] = type
  } else {
    delete catalogCache[key]
  }
  persistToStorage()
}
