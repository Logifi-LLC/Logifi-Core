export interface CatalogPersonCatalogRow {
  entity_id?: unknown
  tag?: unknown
}

export interface CatalogPersonDisplay {
  entityId: string
  displayName: string
}

export function normalizeCrewNameForMatching(value: unknown): string {
  if (typeof value !== 'string') return ''
  const upper = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!upper) return ''
  if (upper.includes(',')) {
    const [last, first] = upper.split(',', 2).map((v) => v.trim())
    return [first, last].filter(Boolean).join(' ')
  }
  return upper
}

function pickBestPersonCatalogDisplayTag(entityId: string, tags: string[]): string {
  if (!tags.length) return entityId
  const keyEid = normalizeCrewNameForMatching(entityId)
  const matching = tags.filter((t) => normalizeCrewNameForMatching(t) === keyEid)
  const pool = matching.length > 0 ? matching : tags
  return pool.reduce((best, t) => (t.length > best.length ? t : best), pool[0]!)
}

/** Build person catalog display names from `catalog_entity_tags` rows (grouped by entity_id). */
export function buildCatalogPersonAlignmentSeeds(
  rows: CatalogPersonCatalogRow[]
): CatalogPersonDisplay[] {
  const byEntity = new Map<string, string[]>()
  for (const r of rows) {
    const eid = typeof r.entity_id === 'string' ? r.entity_id.trim().toLowerCase() : ''
    if (!eid) continue
    const tag = typeof r.tag === 'string' ? r.tag.trim() : ''
    const arr = byEntity.get(eid) ?? []
    if (tag) arr.push(tag)
    byEntity.set(eid, arr)
  }
  const out: CatalogPersonDisplay[] = []
  for (const [entityId, tags] of byEntity) {
    out.push({
      entityId,
      displayName: pickBestPersonCatalogDisplayTag(entityId, tags),
    })
  }
  return out
}

export function listCatalogPersonDisplayNames(rows: CatalogPersonCatalogRow[]): string[] {
  return buildCatalogPersonAlignmentSeeds(rows)
    .map((p) => p.displayName)
    .filter((n) => n.trim().length > 0)
    .sort((a, b) => a.localeCompare(b))
}

export function catalogContainsPersonName(names: string[], candidate: string): boolean {
  const key = normalizeCrewNameForMatching(candidate)
  if (!key) return false
  return names.some((n) => normalizeCrewNameForMatching(n) === key)
}
