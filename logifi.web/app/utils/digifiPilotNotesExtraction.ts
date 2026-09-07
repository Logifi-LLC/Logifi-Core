/**
 * Extract structured priors from Digifi pilot notes
 * Simple deterministic extraction - no LLM needed for v1
 */

export interface DigifiPilotNotesPriors {
  schools: string[]
  bases: string[]
  aircraft: string[]
  eras: string[]
}

// Common flight school patterns
const SCHOOL_PATTERNS = [
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Flight School|Aviation|Flying Club|Flight Academy|Flight Training)\b/gi,
  /\b(?:trained at|learned at|flew at|instructor at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
]

// Common base/airport patterns (3-4 letter codes or full names)
const BASE_PATTERNS = [
  /\b([A-Z]{3,4})\b/g, // ICAO/IATA codes
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Airport|AFB|Air Force Base|Naval Air Station|NAS)\b/gi,
  /\b(?:based at|flew out of|stationed at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
]

// Common aircraft patterns
const AIRCRAFT_PATTERNS = [
  /\b(Cessna|Piper|Beechcraft|Cirrus|Diamond|Mooney|Grumman|Boeing|Airbus|Embraer)\s+\d+[A-Z]*\b/gi,
  /\b(C-\d+[A-Z]*|PA-\d+[A-Z]*|BE-\d+[A-Z]*|SR-\d+[A-Z]*|DA-\d+[A-Z]*|B-\d+[A-Z]*|A-\d+[A-Z]*)\b/gi,
  /\b(F-\d+[A-Z]*|T-\d+[A-Z]*|KC-\d+[A-Z]*|C-\d+[A-Z]*|P-\d+[A-Z]*|H-\d+[A-Z]*)\b/gi, // Military
  /\b(172|152|182|206|150|140|210|310|414|421|PA28|PA32|PA44|SR20|SR22|DA40|DA42)\b/g,
]

// Era patterns (decades, year ranges)
const ERA_PATTERNS = [
  /\b(19\d{2}|20\d{2})\s*-\s*(19\d{2}|20\d{2})\b/g, // Year ranges
  /\b(19\d0s|20\d0s)\b/gi, // Decades
  /\bin\s+(19\d{2}|20\d{2})\b/g, // "in 1995"
]

function extractMatches(text: string, patterns: RegExp[]): string[] {
  const matches = new Set<string>()
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match
    while ((match = regex.exec(text)) !== null) {
      const captured = match[1]?.trim()
      if (captured && captured.length > 1) {
        matches.add(captured)
      }
    }
  }
  
  return Array.from(matches)
}

function normalizeAircraft(aircraft: string[]): string[] {
  // Normalize common abbreviations
  return aircraft.map(ac => {
    const upper = ac.toUpperCase()
    // Map common patterns
    if (/^C-?\d+/.test(upper)) return upper.replace('C-', 'C')
    if (/^PA-?\d+/.test(upper)) return upper.replace('PA-', 'PA')
    if (/^SR-?\d+/.test(upper)) return upper.replace('SR-', 'SR')
    return upper
  })
}

function normalizeBase(base: string): string {
  // Keep 3-4 letter codes uppercase, capitalize names
  if (/^[A-Z]{3,4}$/.test(base)) return base.toUpperCase()
  return base
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function extractDigifiPilotNotesPriors(notes: string | null): DigifiPilotNotesPriors {
  if (!notes || !notes.trim()) {
    return { schools: [], bases: [], aircraft: [], eras: [] }
  }

  const schools = extractMatches(notes, SCHOOL_PATTERNS)
  const bases = extractMatches(notes, BASE_PATTERNS).map(normalizeBase)
  const aircraft = normalizeAircraft(extractMatches(notes, AIRCRAFT_PATTERNS))
  const eras = extractMatches(notes, ERA_PATTERNS)

  return {
    schools: Array.from(new Set(schools)).slice(0, 10), // Cap at 10 each
    bases: Array.from(new Set(bases)).slice(0, 15),
    aircraft: Array.from(new Set(aircraft)).slice(0, 20),
    eras: Array.from(new Set(eras)).slice(0, 10),
  }
}

export function formatPriorsForDisplay(priors: DigifiPilotNotesPriors | null): string {
  if (!priors) return 'None extracted yet'
  
  const parts: string[] = []
  
  if (priors.schools.length > 0) {
    parts.push(`Schools: ${priors.schools.join(', ')}`)
  }
  if (priors.bases.length > 0) {
    parts.push(`Bases/Airports: ${priors.bases.slice(0, 5).join(', ')}${priors.bases.length > 5 ? '...' : ''}`)
  }
  if (priors.aircraft.length > 0) {
    parts.push(`Aircraft: ${priors.aircraft.slice(0, 8).join(', ')}${priors.aircraft.length > 8 ? '...' : ''}`)
  }
  if (priors.eras.length > 0) {
    parts.push(`Eras: ${priors.eras.join(', ')}`)
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'None extracted yet'
}
