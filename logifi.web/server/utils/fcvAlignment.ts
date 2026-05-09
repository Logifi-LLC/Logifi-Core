import type { FcvMappedEntry } from './fcvMap'

export type CrewMatchStrategy =
  | 'exact'
  | 'normalized'
  | 'fuzzy'
  | 'ambiguous'
  | 'unresolved'
  | 'empty'
  | 'manual_override'

export interface AlignmentIndexSourceRow {
  registration: string | null
  aircraft_make_model: string | null
  aircraft_category_class: string | null
  training_elements: string | null
}

interface TailIdentity {
  aircraft_make_model: string | null
  aircraft_category_class: string | null
}

/** One person in catalog_entity_tags after grouping by entity_id. */
export interface CatalogPersonDisplay {
  entityId: string
  displayName: string
}

export interface CatalogPersonCatalogRow {
  entity_id?: unknown
  tag?: unknown
}

export interface AlignmentIndexBuildOptions {
  /**
   * Person catalog from DB (`entity_id` + `tag`). Processed first so FC View crew
   * resolves to catalog display names (tags), not lowercase entity_id alone.
   */
  catalogPersons?: CatalogPersonDisplay[]
  /** @deprecated Prefer catalogPersons; kept for tests — seeds displayName as given with entity key lowercased. */
  catalogPersonNames?: string[]
}

export interface AlignmentIndex {
  tails: Map<string, TailIdentity>
  crewByNormalizedKey: Map<string, string>
  crewCanonicalNames: string[]
}

export interface CrewAlignmentResult {
  resolvedName: string | null
  strategy: CrewMatchStrategy
  rawName: string | null
  normalizedImportedKey: string
  score?: number
  threshold?: number
  margin?: number
  candidatesConsidered: number
  topCandidates?: string[]
}

export interface ResolveCrewNameOptions {
  manualOverrideName?: string | null
}

export interface AlignMappedFcvEntryOptions {
  crewManualOverrideName?: string | null
}

const FUZZY_SCORE_THRESHOLD = 0.82
const FUZZY_SCORE_MARGIN = 0.05

const FCV_TYPE_TO_CANONICAL: Record<string, string> = {
  E75S: 'ERJ-175',
  E75L: 'ERJ-175',
  E175: 'ERJ-175',
  ERJ175: 'ERJ-175',
  EMB175: 'ERJ-175',
  E170: 'ERJ-170',
  ERJ170: 'ERJ-170',
  EMB170: 'ERJ-170',
  FMB170: 'ERJ-170',
  E190: 'ERJ-190',
  ERJ190: 'ERJ-190',
  EMB190: 'ERJ-190',
}

function compactUpper(value: string): string {
  return value.toUpperCase().replace(/[\s._/-]+/g, '')
}

export function normalizeRegistrationKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function normalizeRegistrationDisplay(value: unknown): string {
  return normalizeRegistrationKey(value)
}

export function normalizeFcvAircraftType(value: unknown): string {
  if (typeof value !== 'string') return 'Unknown'
  const raw = value.trim()
  if (!raw) return 'Unknown'
  const compact = compactUpper(raw)
  const exact = FCV_TYPE_TO_CANONICAL[compact]
  if (exact) return exact
  if (compact.startsWith('ERJ175') || compact.startsWith('EMB175')) return 'ERJ-175'
  if (compact.startsWith('ERJ170') || compact.startsWith('EMB170') || compact.startsWith('FMB170')) return 'ERJ-170'
  if (compact.startsWith('ERJ190') || compact.startsWith('EMB190')) return 'ERJ-190'
  return raw.toUpperCase().replace(/\s+/g, ' ')
}

export function mapAircraftCategoryClass(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'AMEL'
  const s = value.trim().toUpperCase()
  if (s === 'AIRPLANE' || s === 'AIRPLANE LAND') return 'AMEL'
  if (s === 'ASEL' || s === 'AMEL' || s === 'ASES' || s === 'AMES') return s
  if (s.includes('HELICOPTER')) return 'HELI'
  if (s.includes('SIM') || s.includes('ATD') || s.includes('FTD') || s.includes('FFS')) return 'SIM'
  return 'AMEL'
}

export function normalizeCrewNameForMatching(value: unknown): string {
  if (typeof value !== 'string') return ''
  const upper = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
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

function splitNamePartsForFuzzy(value: string): { first: string; last: string } {
  const n = normalizeCrewNameForMatching(value)
  if (!n) return { first: '', last: '' }
  const parts = n.split(' ').filter(Boolean)
  if (parts.length === 1) return { first: parts[0], last: parts[0] }
  return { first: parts[0], last: parts[parts.length - 1] }
}

function damerauLevenshtein(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  const dp: number[][] = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0))
  for (let i = 0; i <= al; i++) dp[i][0] = i
  for (let j = 0; j <= bl; j++) dp[0][j] = j
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        best = Math.min(best, dp[i - 2][j - 2] + cost)
      }
      dp[i][j] = best
    }
  }
  return dp[al][bl]
}

function fuzzyScoreNamePair(a: { first: string; last: string }, b: { first: string; last: string }): number {
  if (!a.first || !a.last || !b.first || !b.last) return 0
  if (a.first[0] !== b.first[0] || a.last[0] !== b.last[0]) return 0
  const firstDist = damerauLevenshtein(a.first, b.first)
  const lastDist = damerauLevenshtein(a.last, b.last)
  const firstScore = 1 - firstDist / Math.max(a.first.length, b.first.length, 1)
  const lastScore = 1 - lastDist / Math.max(a.last.length, b.last.length, 1)
  return (firstScore + lastScore) / 2
}

function addCanonicalCrewName(
  crewByNormalizedKey: Map<string, string>,
  crewCanonicalNames: Set<string>,
  candidate: unknown
) {
  const name = typeof candidate === 'string' ? candidate.trim() : ''
  if (!name) return
  const key = normalizeCrewNameForMatching(name)
  if (!key) return
  if (!crewByNormalizedKey.has(key)) {
    crewByNormalizedKey.set(key, name)
  }
  crewCanonicalNames.add(name)
}

function pickBestPersonCatalogDisplayTag(entityId: string, tags: string[]): string {
  if (!tags.length) return entityId
  const keyEid = normalizeCrewNameForMatching(entityId)
  const matching = tags.filter((t) => normalizeCrewNameForMatching(t) === keyEid)
  const pool = matching.length > 0 ? matching : tags
  return pool.reduce((best, t) => (t.length > best.length ? t : best), pool[0]!)
}

function seedCatalogPersonDisplay(
  crewByNormalizedKey: Map<string, string>,
  crewCanonicalNames: Set<string>,
  entityId: string,
  displayName: string
): void {
  const eid = entityId.trim().toLowerCase()
  const display = displayName.trim()
  if (!eid) return
  const key = normalizeCrewNameForMatching(eid)
  if (!key) return
  const canonical = display || eid
  if (!crewByNormalizedKey.has(key)) {
    crewByNormalizedKey.set(key, canonical)
  }
  crewCanonicalNames.add(canonical)
}

/** Build FC View alignment seeds from `catalog_entity_tags` person rows (grouped by entity_id). */
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

export function buildAlignmentIndex(
  rows: AlignmentIndexSourceRow[],
  options: AlignmentIndexBuildOptions = {}
): AlignmentIndex {
  const tails = new Map<string, TailIdentity>()
  const crewByNormalizedKey = new Map<string, string>()
  const crewCanonicalNames = new Set<string>()

  // Person catalog first (display tags), then legacy string list, then logbook rows.
  for (const p of options.catalogPersons ?? []) {
    if (!p.entityId?.trim()) continue
    seedCatalogPersonDisplay(crewByNormalizedKey, crewCanonicalNames, p.entityId, p.displayName)
  }
  for (const catalogName of options.catalogPersonNames ?? []) {
    const n = typeof catalogName === 'string' ? catalogName.trim() : ''
    if (!n) continue
    seedCatalogPersonDisplay(crewByNormalizedKey, crewCanonicalNames, n.toLowerCase(), n)
  }

  for (const row of rows) {
    const tailKey = normalizeRegistrationKey(row.registration ?? '')
    if (tailKey && !tails.has(tailKey)) {
      tails.set(tailKey, {
        aircraft_make_model: row.aircraft_make_model,
        aircraft_category_class: row.aircraft_category_class,
      })
    }
    addCanonicalCrewName(crewByNormalizedKey, crewCanonicalNames, row.training_elements)
  }

  return {
    tails,
    crewByNormalizedKey,
    crewCanonicalNames: [...crewCanonicalNames],
  }
}

export function resolveCrewName(
  rawName: unknown,
  index: AlignmentIndex,
  options: ResolveCrewNameOptions = {}
): CrewAlignmentResult {
  const source = typeof rawName === 'string' ? rawName.trim() : ''
  const manualOverrideName =
    typeof options.manualOverrideName === 'string' ? options.manualOverrideName.trim() : ''

  if (manualOverrideName) {
    return {
      resolvedName: manualOverrideName,
      strategy: 'manual_override',
      rawName: source || null,
      normalizedImportedKey: normalizeCrewNameForMatching(source),
      candidatesConsidered: index.crewCanonicalNames.length,
    }
  }

  if (!source) {
    return {
      resolvedName: null,
      strategy: 'empty',
      rawName: null,
      normalizedImportedKey: '',
      candidatesConsidered: 0,
    }
  }
  if (index.crewCanonicalNames.includes(source)) {
    return {
      resolvedName: source,
      strategy: 'exact',
      rawName: source,
      normalizedImportedKey: normalizeCrewNameForMatching(source),
      candidatesConsidered: index.crewCanonicalNames.length,
    }
  }
  const normalized = normalizeCrewNameForMatching(source)
  const exactNormalized = index.crewByNormalizedKey.get(normalized)
  if (exactNormalized) {
    return {
      resolvedName: exactNormalized,
      strategy: 'normalized',
      rawName: source,
      normalizedImportedKey: normalized,
      candidatesConsidered: index.crewCanonicalNames.length,
    }
  }
  const incomingParts = splitNamePartsForFuzzy(source)
  const scored = index.crewCanonicalNames
    .map((name) => ({
      name,
      score: fuzzyScoreNamePair(incomingParts, splitNamePartsForFuzzy(name)),
    }))
    .sort((a, b) => b.score - a.score)
  const best = scored[0]
  const second = scored[1]
  const margin = best && second ? best.score - second.score : best ? best.score : 0
  if (
    best &&
    best.score >= FUZZY_SCORE_THRESHOLD &&
    margin >= FUZZY_SCORE_MARGIN
  ) {
    return {
      resolvedName: best.name,
      strategy: 'fuzzy',
      rawName: source,
      normalizedImportedKey: normalized,
      score: best.score,
      threshold: FUZZY_SCORE_THRESHOLD,
      margin,
      candidatesConsidered: index.crewCanonicalNames.length,
      topCandidates: scored.slice(0, 3).map((c) => c.name),
    }
  }
  return {
    resolvedName: source,
    strategy: best ? 'ambiguous' : 'unresolved',
    rawName: source,
    normalizedImportedKey: normalized,
    score: best?.score,
    threshold: FUZZY_SCORE_THRESHOLD,
    margin,
    candidatesConsidered: index.crewCanonicalNames.length,
    topCandidates: scored.slice(0, 5).map((c) => c.name),
  }
}

export function alignMappedFcvEntry(
  entry: FcvMappedEntry,
  index: AlignmentIndex,
  options: AlignMappedFcvEntryOptions = {}
): FcvMappedEntry {
  const tailKey = normalizeRegistrationKey(entry.registration)
  const tailIdentity = tailKey ? index.tails.get(tailKey) : undefined
  const resolvedType =
    tailIdentity?.aircraft_make_model?.trim() ||
    normalizeFcvAircraftType(entry.aircraft_make_model)
  const resolvedCategory =
    tailIdentity?.aircraft_category_class?.trim() ||
    mapAircraftCategoryClass(entry.aircraft_category_class)
  const crewResult = resolveCrewName(entry.training_elements, index, {
    manualOverrideName: options.crewManualOverrideName ?? null,
  })
  const import_metadata = {
    ...(entry.import_metadata ?? {}),
    alignment: {
      tail_key: tailKey,
      aircraft_strategy: tailIdentity ? 'tail_match' : 'type_normalized',
      crew: {
        raw_name: crewResult.rawName,
        resolved_name: crewResult.resolvedName,
        normalized_key: crewResult.normalizedImportedKey,
        strategy: crewResult.strategy,
        score: crewResult.score,
        threshold: crewResult.threshold,
        margin: crewResult.margin,
        candidates_considered: crewResult.candidatesConsidered,
        top_candidates: crewResult.topCandidates ?? [],
      },
    },
  }
  return {
    ...entry,
    registration: normalizeRegistrationDisplay(entry.registration),
    aircraft_make_model: resolvedType || 'Unknown',
    aircraft_category_class: resolvedCategory || 'AMEL',
    training_elements: crewResult.resolvedName ?? null,
    import_metadata,
  }
}
