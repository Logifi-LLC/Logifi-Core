/** YX (IATA), RPA (ICAO), then major-airline marketed numbers. Keep in sync across enrich providers. */
export const RJET_FLIGHT_NUMBER_PREFIXES = ['YX', 'RPA', 'AA', 'UA', 'DL'] as const

function normalizeFlightNumberRaw(flightNumber: string): string {
  return flightNumber.trim().toUpperCase().replace(/\s+/g, '')
}

function digitsFromNormalizedRaw(raw: string): string {
  return raw.replace(/^[A-Z]+/, '') || raw
}

/**
 * AeroDataBox search numbers for a schedule flight number.
 * RJET: YX / RPA / AA / UA / DL + digits, then the bare number.
 */
export function aeroDataBoxFlightNumberCandidates(
  flightNumber: string,
  airlineCode?: string
): string[] {
  const raw = normalizeFlightNumberRaw(flightNumber)
  if (!raw) return []
  if (/^[A-Z]{2}\d/.test(raw)) return [raw]

  const digits = digitsFromNormalizedRaw(raw)
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (code === 'RJET') {
    const out: string[] = []
    for (const prefix of RJET_FLIGHT_NUMBER_PREFIXES) {
      out.push(`${prefix}${digits}`)
    }
    out.push(digits)
    return out
  }
  return [raw]
}

/**
 * FlightAware AeroAPI flight idents (designator) for a schedule flight number.
 * RJET expands to real idents; other airline codes prepend the code to digits.
 */
export function flightAwareSearchIdents(
  flightNumber: string,
  airlineCode?: string
): string[] {
  const raw = normalizeFlightNumberRaw(flightNumber)
  if (!raw) return []
  if (/^[A-Z]{2}\d/.test(raw)) return [raw]

  const digits = digitsFromNormalizedRaw(raw)
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (code === 'RJET') {
    const out: string[] = []
    for (const prefix of RJET_FLIGHT_NUMBER_PREFIXES) {
      out.push(`${prefix}${digits}`)
    }
    out.push(digits)
    return out
  }
  if (code) {
    return [`${code}${digits}`]
  }
  return [flightNumber.trim()]
}
