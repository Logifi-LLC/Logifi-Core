export function normalizeAircraftFamily(makeModel: string): string {
  if (!makeModel) return ''
  const s = makeModel.toUpperCase().replace(/\s+/g, ' ').trim()

  // Cessna: C150/C152/C172/C182/C206/C210/etc with optional suffix letters
  const cMatch = s.match(/\bC(\d{3})([A-Z]*)\b/)
  if (cMatch) return `C${cMatch[1]}`
  if (s.includes('CESSNA 172')) return 'C172'
  if (s.includes('CESSNA 182')) return 'C182'
  if (s.includes('CESSNA 150')) return 'C150'
  if (s.includes('CESSNA 152')) return 'C152'
  if (s.includes('CESSNA 206')) return 'C206'
  if (s.includes('CESSNA 210')) return 'C210'

  // Piper
  const pa = s.match(/\bPA[-\s]?(\d{2})\b/)
  if (pa) return `PA-${pa[1]}`
  if (s.includes('PIPER ARCHER') || s.includes('PA-28')) return 'PA-28'
  if (s.includes('PA-18')) return 'PA-18'
  if (s.includes('PA-32')) return 'PA-32'
  if (s.includes('PA-34')) return 'PA-34'

  // Cirrus
  if (s.includes('SR20')) return 'SR20'
  if (s.includes('SR22')) return 'SR22'

  // Diamond
  if (s.includes('DA40')) return 'DA40'
  if (s.includes('DA42')) return 'DA42'
  if (s.includes('DA20')) return 'DA20'

  // Beechcraft
  if (s.includes('BE58') || s.includes('BARON')) return 'BE-58'
  if (s.includes('BE36') || s.includes('BONANZA')) return 'BE-36'

  // Embraer ERJ/EMB family canonicalization
  if (
    s.includes('ERJ 170') ||
    s.includes('ERJ170') ||
    s.includes('EMB-170') ||
    s.includes('ERJ-170') ||
    s.includes('FMB-170')
  ) {
    return 'ERJ-170'
  }
  if (s.includes('ERJ 175') || s.includes('ERJ175') || s.includes('EMB-175') || s.includes('ERJ-175')) {
    return 'ERJ-175'
  }
  if (s.includes('ERJ 190') || s.includes('ERJ190') || s.includes('EMB-190') || s.includes('ERJ-190')) {
    return 'ERJ-190'
  }

  // Fallback: first alnum aircraft token and strip trailing letters
  const token = (s.match(/\b[A-Z]+\d+[A-Z]*\b/) || [])[0]
  if (token) {
    const m = token.match(/^([A-Z]+\d+)/)
    return m?.[1] ?? token
  }
  return s
}

export function dedupeNonEmptyTags(tags: Array<string | null | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of tags) {
    const t = typeof raw === 'string' ? raw.trim() : ''
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function mergeEntryTagsWithFamilyTags(
  entryTags: Array<string | null | undefined>,
  aircraftMakeModel: string,
  familyTagsById: Map<string, string[]>
): string[] {
  const familyKey = normalizeAircraftFamily(aircraftMakeModel)
  const familyTags = familyKey ? (familyTagsById.get(familyKey) ?? []) : []
  return dedupeNonEmptyTags([...(entryTags ?? []), ...familyTags])
}
