/** FAA type-rating designations (e.g. B-737, C/L-18, A/ERJ-170). */
const TYPE_RATING_CODE_RE = /^[A-Z0-9]{1,4}\/[A-Z0-9][A-Z0-9./-]*$/i

const INSTRUCTOR_CERTIFICATE_RE =
  /\b(flight instructor|ground instructor|instrument instructor)\b/i

/** Category letter + designator (e.g. A/erj-170 → A/ERJ-170). */
export function formatTypeRatingCode(code: string): string {
  const trimmed = code.trim()
  if (!trimmed) return ''
  const slash = trimmed.indexOf('/')
  if (slash > 0) {
    return `${trimmed.slice(0, slash).toUpperCase()}/${trimmed.slice(slash + 1).toUpperCase()}`
  }
  return trimmed.toUpperCase()
}

export function isInstructorCertificateLevel(level: string): boolean {
  return INSTRUCTOR_CERTIFICATE_RE.test(level)
}

function formatWord(word: string): string {
  const cleaned = word.trim()
  if (!cleaned) return ''
  if (cleaned.includes('-')) {
    return cleaned.split('-').map((part) => formatWord(part)).join('-')
  }
  if (cleaned.includes("'")) {
    return cleaned
      .split("'")
      .map((part, index) => (index === 0 ? formatWord(part) : part.toLowerCase()))
      .join("'")
  }
  const lower = cleaned.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * FAA names are often `LAST, FIRST MIDDLE` in ALL CAPS.
 * Returns readable order: `First Middle Last`.
 */
export function formatAirmanRegistryName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''

  if (trimmed.includes(',')) {
    const commaIdx = trimmed.indexOf(',')
    const last = trimmed.slice(0, commaIdx).trim()
    const given = trimmed.slice(commaIdx + 1).trim()
    const givenParts = given.split(/\s+/).filter(Boolean).map(formatWord)
    return [...givenParts, formatWord(last)].join(' ')
  }

  return trimmed.split(/\s+/).filter(Boolean).map(formatWord).join(' ')
}

/** Certificate level, rating, or privilege line from the FAA registry. */
export function formatRegistryLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const compact = trimmed.replace(/\s+/g, '')
  if (TYPE_RATING_CODE_RE.test(compact)) {
    return formatTypeRatingCode(trimmed)
  }

  return trimmed.split(/\s+/).map(formatWord).join(' ')
}

export function formatRegistryCertificateLines(lines: string[]): string {
  return lines.map(formatRegistryLabel).filter(Boolean).join(' · ')
}

/** Pilot certificates first; instructor block after a blank line. */
export function formatGroupedCertificateBlocks(pilotParts: string[], instructorParts: string[]): string {
  const pilot = pilotParts.filter(Boolean).join(' · ')
  const instructor = instructorParts.filter(Boolean).join(' · ')
  if (pilot && instructor) return `${pilot}\n\n${instructor}`
  return pilot || instructor
}
