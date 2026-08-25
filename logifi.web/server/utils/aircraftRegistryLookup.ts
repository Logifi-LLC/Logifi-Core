import type { AircraftInfo } from '../../shared/aircraftLookupLocal'
import { resolveDbRegistrationKey } from '../../shared/aircraftLookupLocal'

export interface AircraftDatabaseMeta {
  generatedAt?: string
  recordCount?: number
}

export interface AircraftRegistryDeps {
  loadDatabase: () => Record<string, Partial<AircraftInfo>> | null
  loadMeta: () => AircraftDatabaseMeta | null
  queryLiveRegistry: (registration: string) => Promise<Partial<AircraftInfo> | null>
}

export function asOfFromMeta(meta: AircraftDatabaseMeta | null | undefined): string | undefined {
  const generatedAt = meta?.generatedAt?.trim()
  if (!generatedAt) return undefined
  return generatedAt.slice(0, 10)
}

export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseFaaRegistryHtml(html: string, registration: string): Partial<AircraftInfo> | null {
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
    const engineModel = extractValue('Engine Model') || extractValue('Engine')
    const engineType = extractValue('Engine Type')
    const category = extractValue('Aircraft Category') || extractValue('Type Aircraft') || extractValue('Category')
    const owner = extractValue('Owner Name') || extractValue('Registered Owner') || extractValue('Name')
    const city = extractValue('City')
    const state = extractValue('State')

    const data: Partial<AircraftInfo> = {
      registration,
      make: make || undefined,
      model: model || undefined,
      year: year || undefined,
      engineType: engineType || undefined,
      engineModel: engineModel || undefined,
      category: category || undefined,
      owner: owner || undefined,
      city: city || undefined,
      state: state || undefined,
    }

    const hasValue = Object.entries(data).some(
      ([key, value]) => key !== 'registration' && Boolean(value)
    )
    return hasValue ? data : null
  } catch {
    return null
  }
}

export function overlayOwnerFromLive(
  local: AircraftInfo,
  live: Partial<AircraftInfo> | null,
  checkedAt = todayUtcDate()
): AircraftInfo {
  if (!live?.owner) {
    return { ...local }
  }

  return {
    ...local,
    owner: live.owner,
    city: live.city || local.city,
    state: live.state || local.state,
    ownerCheckedAt: checkedAt,
    source: 'Local Database (FAA) + live owner',
  }
}

export function withLocalSource(
  local: Partial<AircraftInfo>,
  registration: string,
  asOf?: string
): AircraftInfo {
  return {
    ...local,
    registration,
    source: 'Local Database (FAA)',
    asOf: asOf || local.asOf,
  }
}

export async function lookupAircraftRegistration(
  registration: string,
  options: { refreshOwner?: boolean } = {},
  deps: AircraftRegistryDeps
): Promise<{ success: boolean; data?: AircraftInfo; error?: string }> {
  const normalizedReg = registration.trim().toUpperCase().replace(/[-\s]/g, '')

  if (!normalizedReg) {
    return { success: false, error: 'Registration number is required' }
  }

  if (!normalizedReg.startsWith('N') || normalizedReg.length < 3) {
    return {
      success: false,
      error: 'Invalid registration format. US registrations must start with N.',
    }
  }

  const db = deps.loadDatabase()
  const dbKey = db ? resolveDbRegistrationKey(normalizedReg, db) : null
  const localResult = dbKey && db ? db[dbKey] : undefined
  const asOf = asOfFromMeta(deps.loadMeta())

  if (localResult) {
    const local = withLocalSource(localResult, normalizedReg, asOf)
    if (!options.refreshOwner) {
      return { success: true, data: local }
    }

    try {
      const live = await deps.queryLiveRegistry(normalizedReg)
      return { success: true, data: overlayOwnerFromLive(local, live) }
    } catch {
      return { success: true, data: local }
    }
  }

  const faaResult = await deps.queryLiveRegistry(normalizedReg)
  if (faaResult && (faaResult.make || faaResult.model || faaResult.year || faaResult.owner)) {
    return {
      success: true,
      data: {
        ...faaResult,
        registration: normalizedReg,
        source: 'FAA API (Recent Registration)',
        ownerCheckedAt: faaResult.owner ? todayUtcDate() : undefined,
      },
    }
  }

  return {
    success: false,
    error: 'Aircraft not found in database or FAA registry',
  }
}
