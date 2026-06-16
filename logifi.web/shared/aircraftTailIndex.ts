import { normalizeRegistrationKey } from './logbookDataBridge/formatters'

export interface AircraftTailIdentity {
  aircraftMakeModel: string | null
  aircraftCategoryClass: string | null
  updatedAt: string | null
}

export type AircraftTailIndex = Map<string, AircraftTailIdentity>

export interface AircraftTailIndexSourceRow {
  registration?: string | null
  aircraft_make_model?: string | null
  aircraft_category_class?: string | null
  updated_at?: string | null
  aircraftMakeModel?: string | null
  aircraftCategoryClass?: string | null
  updatedAt?: string | null
}

export function normalizeAircraftTailKey(value: unknown): string {
  return normalizeRegistrationKey(value)
}

export function compactMakeModelForMatching(value: string): string {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isMakeModelSpellingVariant(a: string, b: string): boolean {
  const ca = compactMakeModelForMatching(a)
  const cb = compactMakeModelForMatching(b)
  if (!ca || !cb) return false
  return ca === cb || ca.includes(cb) || cb.includes(ca)
}

function rowUpdatedAt(row: AircraftTailIndexSourceRow): string {
  return (row.updatedAt ?? row.updated_at ?? '').trim()
}

function rowMakeModel(row: AircraftTailIndexSourceRow): string | null {
  const value = row.aircraftMakeModel ?? row.aircraft_make_model ?? null
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || null
}

function rowCategoryClass(row: AircraftTailIndexSourceRow): string | null {
  const value = row.aircraftCategoryClass ?? row.aircraft_category_class ?? null
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || null
}

export function buildAircraftTailIndex(rows: AircraftTailIndexSourceRow[]): AircraftTailIndex {
  const index: AircraftTailIndex = new Map()

  for (const row of rows) {
    const key = normalizeAircraftTailKey(row.registration ?? '')
    if (!key) continue

    const updatedAt = rowUpdatedAt(row)
    const makeModel = rowMakeModel(row)
    const categoryClass = rowCategoryClass(row)
    const existing = index.get(key)

    if (!existing) {
      index.set(key, {
        aircraftMakeModel: makeModel,
        aircraftCategoryClass: categoryClass,
        updatedAt: updatedAt || null,
      })
      continue
    }

    if ((updatedAt || '') > (existing.updatedAt || '')) {
      index.set(key, {
        aircraftMakeModel: makeModel || existing.aircraftMakeModel,
        aircraftCategoryClass: categoryClass || existing.aircraftCategoryClass,
        updatedAt: updatedAt || existing.updatedAt,
      })
      continue
    }

    if (!existing.aircraftMakeModel && makeModel) {
      existing.aircraftMakeModel = makeModel
    }
    if (!existing.aircraftCategoryClass && categoryClass) {
      existing.aircraftCategoryClass = categoryClass
    }
  }

  return index
}

export function shouldApplyTailCanonicalMakeModel(
  scannedMakeModel: string,
  canonicalMakeModel: string
): boolean {
  const scanned = (scannedMakeModel || '').trim()
  const canonical = (canonicalMakeModel || '').trim()
  if (!canonical) return false
  if (!scanned || scanned.toLowerCase() === 'unknown') return true
  if (scanned === canonical) return false
  return isMakeModelSpellingVariant(scanned, canonical)
}

export interface ResolveAircraftByTailResult {
  aircraftMakeModel: string
  aircraftCategoryClass: string | null
  fromTail: boolean
}

export function resolveAircraftByTail(
  tail: string,
  scannedMakeModel: string,
  index: AircraftTailIndex
): ResolveAircraftByTailResult {
  const scanned = (scannedMakeModel || '').trim()
  const key = normalizeAircraftTailKey(tail)
  if (!key) {
    return {
      aircraftMakeModel: scanned || 'Unknown',
      aircraftCategoryClass: null,
      fromTail: false,
    }
  }

  const identity = index.get(key)
  const canonical = identity?.aircraftMakeModel?.trim() || ''
  if (!canonical) {
    return {
      aircraftMakeModel: scanned || 'Unknown',
      aircraftCategoryClass: identity?.aircraftCategoryClass ?? null,
      fromTail: false,
    }
  }

  if (shouldApplyTailCanonicalMakeModel(scanned, canonical)) {
    return {
      aircraftMakeModel: canonical,
      aircraftCategoryClass: identity?.aircraftCategoryClass ?? null,
      fromTail: true,
    }
  }

  return {
    aircraftMakeModel: scanned || canonical,
    aircraftCategoryClass: identity?.aircraftCategoryClass ?? null,
    fromTail: false,
  }
}

export function consolidateAircraftMakeModelByTail<T extends AircraftTailIndexSourceRow>(
  entries: T[]
): { entries: T[]; updatedCount: number } {
  const index = buildAircraftTailIndex(entries)
  let updatedCount = 0

  const nextEntries = entries.map((entry) => {
    const tail = (entry.registration ?? '').trim()
    const currentMakeModel = rowMakeModel(entry) || ''
    const resolved = resolveAircraftByTail(tail, currentMakeModel, index)
    if (!resolved.fromTail) return entry

    const currentCategory = rowCategoryClass(entry)
    const nextCategory =
      resolved.aircraftCategoryClass && !currentCategory
        ? resolved.aircraftCategoryClass
        : currentCategory

    const makeModelChanged = currentMakeModel !== resolved.aircraftMakeModel
    const categoryChanged = !!nextCategory && nextCategory !== currentCategory
    if (!makeModelChanged && !categoryChanged) return entry

    updatedCount += 1
    const updated: T = {
      ...entry,
      aircraftMakeModel: resolved.aircraftMakeModel,
      aircraft_make_model: resolved.aircraftMakeModel,
    }
    if (categoryChanged && nextCategory) {
      ;(updated as AircraftTailIndexSourceRow).aircraftCategoryClass = nextCategory
      ;(updated as AircraftTailIndexSourceRow).aircraft_category_class = nextCategory
    }
    return updated
  })

  return { entries: nextEntries, updatedCount }
}
