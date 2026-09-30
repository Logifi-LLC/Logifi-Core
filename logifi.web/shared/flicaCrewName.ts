/**
 * FLICA seeds the other pilot as ALL CAPS `LAST, FIRST [MIDDLE]`.
 * Catalog entries are `First Last`. These helpers fold both into one match key.
 */

export interface PreviewCrewLeg {
  id: string
  rawName: string
}

function collapseSpace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function titleCasePlain(token: string): string {
  if (!token) return ''
  const lower = token.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function titleCaseToken(token: string): string {
  const stripped = token.replace(/^[.'’,;:]+|[.'’,;:]+$/g, '')
  if (!stripped) return ''
  return stripped
    .split('-')
    .map((hyphenPart) => {
      const sep = hyphenPart.includes('’') ? '’' : "'"
      return hyphenPart
        .split(/['’]/)
        .map((part) => titleCasePlain(part))
        .join(sep)
    })
    .filter(Boolean)
    .join('-')
}

function displayTokens(part: string): string[] {
  return part
    .split(/\s+/)
    .map((token) => titleCaseToken(token))
    .filter(Boolean)
}

/** `LAST, FIRST [MIDDLE]` → `First [Middle] Last`. Already-ordered names stay in order. */
export function normalizeFlicaCrewName(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = collapseSpace(value.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
  if (!trimmed) return ''
  const commaIdx = trimmed.indexOf(',')
  if (commaIdx >= 0) {
    const last = displayTokens(trimmed.slice(0, commaIdx))
    const given = displayTokens(trimmed.slice(commaIdx + 1))
    return [...given, ...last].join(' ')
  }
  return displayTokens(trimmed).join(' ')
}

/** Case-insensitive key. Ignores extra spaces and punctuation (periods, apostrophes, hyphens). */
export function flicaCrewMatchKey(value: unknown): string {
  return normalizeFlicaCrewName(value)
    .toLowerCase()
    .replace(/[-/]/g, ' ')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function flicaCrewNamesMatch(a: unknown, b: unknown): boolean {
  const key = flicaCrewMatchKey(a)
  return key.length > 0 && key === flicaCrewMatchKey(b)
}

function matchTokens(value: unknown): string[] {
  const key = flicaCrewMatchKey(value)
  return key ? key.split(' ') : []
}

/**
 * Typeahead: either order, partial tokens, and seeded `LAST, FIRST` all hit the catalog.
 * Single-letter initials are ignored when the query also has a longer token, so
 * `SMITH, JOHN A` still finds `John Smith`.
 */
export function catalogPilotMatchesQuery(catalogName: string, query: string): boolean {
  const queryTokens = matchTokens(query)
  if (queryTokens.length === 0) return true
  const substantial = queryTokens.filter((token) => token.length >= 2)
  const needed = substantial.length > 0 ? substantial : queryTokens
  const available = matchTokens(catalogName)
  if (available.length === 0) return false
  const pool = [...available]
  for (const token of needed) {
    const idx = pool.findIndex((nameToken) => nameToken.startsWith(token))
    if (idx < 0) return false
    pool.splice(idx, 1)
  }
  return true
}

export function filterCatalogPilotNames(
  catalog: readonly string[],
  query: string,
  limit = 40
): string[] {
  const q = query.trim()
  if (!q) return catalog.slice(0, limit)
  return catalog.filter((name) => catalogPilotMatchesQuery(name, q)).slice(0, limit)
}

/** Catalog display name when exactly one entry shares the FLICA name's match key. */
export function uniqueConfidentCatalogMatch(
  catalog: readonly string[],
  rawName: string
): string | null {
  const key = flicaCrewMatchKey(rawName)
  if (!key) return null
  const matches = [
    ...new Set(catalog.filter((name) => flicaCrewMatchKey(name) === key)),
  ]
  return matches.length === 1 ? matches[0]! : null
}

export function seedPreviewCrewNames(
  legs: readonly PreviewCrewLeg[],
  catalog: readonly string[],
  existing: Readonly<Record<string, string>> = {}
): Record<string, string> {
  const next: Record<string, string> = { ...existing }
  for (const leg of legs) {
    const id = leg.id.trim()
    if (!id || Object.prototype.hasOwnProperty.call(next, id)) continue
    const raw = leg.rawName.trim()
    next[id] = uniqueConfidentCatalogMatch(catalog, raw) ?? raw
  }
  return next
}

/**
 * Apply a catalog pick to every preview leg with the same normalized FLICA name.
 * Legs the user already edited stay as they are. The picked leg is marked manual.
 */
export function applyCatalogPilotPick(
  legs: readonly PreviewCrewLeg[],
  current: Readonly<Record<string, string>>,
  manualIds: ReadonlySet<string>,
  pickedId: string,
  pickedName: string
): { names: Record<string, string>; manualIds: Set<string> } {
  const id = pickedId.trim()
  const names: Record<string, string> = { ...current }
  if (id) names[id] = pickedName
  const manual = new Set(manualIds)
  if (id) manual.add(id)
  const source = legs.find((leg) => leg.id.trim() === id)
  const key = source ? flicaCrewMatchKey(source.rawName) : ''
  if (!key) return { names, manualIds: manual }
  for (const leg of legs) {
    const otherId = leg.id.trim()
    if (!otherId || otherId === id || manual.has(otherId)) continue
    if (flicaCrewMatchKey(leg.rawName) === key) names[otherId] = pickedName
  }
  return { names, manualIds: manual }
}
