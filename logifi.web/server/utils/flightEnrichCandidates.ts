/** YX (IATA), RPA (ICAO), then major-airline marketed numbers. Keep in sync across enrich providers. */
export const RJET_FLIGHT_NUMBER_PREFIXES = ['YX', 'RPA', 'AA', 'UA', 'DL'] as const

/** FlightAware RJET: try Republic idents before marketed majors. */
export const RJET_FLIGHT_AWARE_TIER1_PREFIXES = ['YX', 'RPA'] as const
export const RJET_FLIGHT_AWARE_TIER2_PREFIXES = ['AA', 'UA', 'DL'] as const

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

function rjetFlightAwareIdentsForPrefixes(
  digits: string,
  prefixes: readonly string[],
  stickyPrefix?: string | null
): string[] {
  const ordered = [...prefixes]
  const sticky = (stickyPrefix ?? '').trim().toUpperCase()
  if (sticky && ordered.includes(sticky)) {
    ordered.sort((a, b) => {
      if (a === sticky) return -1
      if (b === sticky) return 1
      return 0
    })
  }
  return ordered.map((p) => `${p}${digits}`)
}

/**
 * FlightAware AeroAPI idents in search tiers (RJET: YX/RPA then AA/UA/DL/bare).
 */
export function flightAwareSearchIdentTiers(
  flightNumber: string,
  airlineCode?: string,
  stickyPrefix?: string | null
): string[][] {
  const raw = normalizeFlightNumberRaw(flightNumber)
  if (!raw) return []
  if (/^[A-Z]{2}\d/.test(raw)) return [[raw]]

  const digits = digitsFromNormalizedRaw(raw)
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (code === 'RJET') {
    const tier1 = rjetFlightAwareIdentsForPrefixes(
      digits,
      RJET_FLIGHT_AWARE_TIER1_PREFIXES,
      stickyPrefix
    )
    const tier2 = [
      ...rjetFlightAwareIdentsForPrefixes(digits, RJET_FLIGHT_AWARE_TIER2_PREFIXES, stickyPrefix),
      digits,
    ]
    return [tier1, tier2]
  }
  const single = code ? [`${code}${digits}`] : [flightNumber.trim()]
  return [single]
}

/**
 * FlightAware AeroAPI flight idents (designator) for a schedule flight number.
 * RJET expands to real idents; other airline codes prepend the code to digits.
 */
export function flightAwareSearchIdents(
  flightNumber: string,
  airlineCode?: string,
  stickyPrefix?: string | null
): string[] {
  return flightAwareSearchIdentTiers(flightNumber, airlineCode, stickyPrefix).flat()
}
