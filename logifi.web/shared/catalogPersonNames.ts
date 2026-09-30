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

/**
 * Autofi's person-catalog marker: a tag whose text is the person's own name.
 * Kept in `catalog_entity_tags` for FLICA matching. Not a user-facing tag.
 * The generic `crew` fallback is never treated as this marker.
 */
export function isPersonCatalogNameMarker(
  personName: string | null | undefined,
  tag: string | null | undefined,
): boolean {
  const name = (personName ?? '').trim().toLowerCase()
  const label = (tag ?? '').trim().toLowerCase()
  if (!name || !label) return false
  if (label === 'crew') return false
  return label === name
}

/** Tags to show. Drops the person's own-name catalog marker; leaves stored tags unchanged. */
export function tagsExcludingPersonNameMarker(
  personName: string | null | undefined,
  tags: readonly string[] | null | undefined,
): string[] {
  return (tags ?? []).filter((tag) => !isPersonCatalogNameMarker(personName, tag))
}
