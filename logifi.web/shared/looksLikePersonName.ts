const LESSON_WORDS = new Set([
  'work',
  'nav',
  'navigation',
  'stalls',
  'landings',
  'maneuvers',
  'approach',
  'hood',
  'xc',
  'pattern',
  'checkride',
  'review',
])

/** First letter, then letters / hyphen / apostrophe / period only. */
const NAME_TOKEN = /^[A-Za-z][A-Za-z'.-]*$/

function tokenLetters(token: string): string {
  return token.replace(/[^A-Za-z]/g, '').toLowerCase()
}

/**
 * True for a person-shaped name (two+ alphabetic words). Lesson phrases such as
 * "Hood work" or "XC navigation" return false. Display/catalog/import filter only.
 */
export function looksLikePersonName(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false
  const tokens = value.trim().split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return false

  for (const token of tokens) {
    if (!NAME_TOKEN.test(token)) return false
    if (LESSON_WORDS.has(tokenLetters(token))) return false
  }
  return true
}

export function collectPilotCatalogNames(entry: {
  trainingElements?: string | null
  picName?: string | null
  sicName?: string | null
}): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  const add = (raw: string | null | undefined, requirePersonName: boolean) => {
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    if (!trimmed) return
    if (requirePersonName && !looksLikePersonName(trimmed)) return
    const key = trimmed.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    names.push(trimmed)
  }

  add(entry.picName, false)
  add(entry.sicName, false)
  add(entry.trainingElements, true)
  return names
}
