import type { BridgeSource } from './types'

function headerSet(headers: string[]): Set<string> {
  return new Set(headers.map((h) => h.toLowerCase().trim()))
}

function scoreSource(headers: string[], source: BridgeSource): number {
  const set = headerSet(headers)
  let score = 0

  switch (source) {
    case 'foreflight':
      if (set.has('aircraftid') || set.has('aircraft id')) score += 2
      if (set.has('totaltime') || set.has('total time')) score += 2
      if (set.has('from')) score += 1
      if (set.has('date') || set.has('flightdate')) score += 2
      if (set.has('pilotcomments')) score += 1
      break
    case 'logten':
      // LogTen Dynamic Export (Tab) — human-readable airline template
      if (set.has('flight #')) score += 4
      if (set.has('aircraft id')) score += 2
      if (set.has('aircraft type')) score += 2
      if (set.has('pic/p1 crew') || set.has('sic/p2 crew')) score += 4
      if (set.has('multi-engine land')) score += 3
      if (set.has('approach 1')) score += 2
      // Internal-key LogTen exports
      if (set.has('flight_flightdate')) score += 3
      if (set.has('flight_date')) score += 3
      if (set.has('aircraft_aircraftid')) score += 2
      if (set.has('aircraft_registration')) score += 3
      if (set.has('flight_from')) score += 1
      break
    case 'myflightbook':
      if (set.has('tail number')) score += 3
      if (set.has('total flight time')) score += 3
      if (set.has('x-country')) score += 1
      break
    case 'logifi-native':
      if (set.has('total flight time')) score += 2
      if (set.has('registration')) score += 2
      if (set.has('aircraft category/class')) score += 2
      if (set.has('data hash')) score += 2
      break
    case 'generic':
      if (set.has('departure') && set.has('destination')) score += 1
      if (set.has('total time')) score += 1
      break
  }

  return score
}

export function detectBridgeSource(headers: string[]): BridgeSource {
  const sources: BridgeSource[] = [
    'foreflight',
    'logten',
    'myflightbook',
    'logifi-native',
    'generic',
  ]

  let best: BridgeSource = 'generic'
  let bestScore = 0

  for (const source of sources) {
    const s = scoreSource(headers, source)
    if (s > bestScore) {
      bestScore = s
      best = source
    }
  }

  return bestScore > 0 ? best : 'generic'
}

export function detectSourceFromContent(content: string): BridgeSource {
  const firstLine = content.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const headers = firstLine.split(/[,\t]/).map((h) => h.trim().replace(/^"|"$/g, ''))
  return detectBridgeSource(headers)
}
