/**
 * Confirmed FLICA portals. Hosts are explicit: they are not derived from
 * IATA or ICAO (Republic is rpa.flica.net, not rjet). Airline codes are the
 * FlightAware ICAO ident, except Republic, which stays RJET so existing rows
 * and the RJET enrichment tiers keep working.
 *
 * Only carriers with a public page that names the airline (or an official
 * CAE help pack on that host) belong here. Do not add a host from a guess.
 *
 * Autofi offer list: add an airline code here to show it in the connect picker
 * once a tester exists (one-line re-enable). All other carriers stay in
 * FLICA_CARRIERS for parsing and stored integrations.
 */
export const ENABLED_FLICA_AIRLINE_CODES: readonly string[] = ['RJET']

export const DEFAULT_FLICA_AIRLINE_CODE = 'RJET'

export type FlicaTripIdKind = 'republic' | 'generic'

export type FlicaUnsupportedReason = 'airline_sso'

export interface FlicaCarrier {
  airlineCode: string
  displayName: string
  host: string
  /** False only for Republic, the airline Autofi was built against. */
  beta: boolean
  /** When set, Autofi must not offer connect/fetch for this carrier. */
  unsupportedReason?: FlicaUnsupportedReason
  /**
   * Prefixed onto a digits-only employee number. Set only when that prefix
   * is confirmed. Other airlines must send the full FLICA User ID.
   */
  userIdPrefix?: string
  /** Which shared pairing-id pattern the parser should use. Not a code path. */
  tripIdKind: FlicaTripIdKind
  /**
   * Shared crew-name digest is loaded for this airline. The pilot's own
   * person catalog is separate and is not gated by this flag.
   */
  crewDigest: boolean
}

export const FLICA_CARRIERS: readonly FlicaCarrier[] = [
  {
    airlineCode: 'RJET',
    displayName: 'Republic',
    host: 'rpa.flica.net',
    beta: false,
    userIdPrefix: 'RPA',
    tripIdKind: 'republic',
    crewDigest: true,
  },
  {
    airlineCode: 'EDV',
    displayName: 'Endeavor Air',
    host: 'endeavor.flica.net',
    beta: true,
    tripIdKind: 'generic',
    crewDigest: false,
  },
  {
    airlineCode: 'AWI',
    displayName: 'Air Wisconsin',
    host: 'airwis.flica.net',
    beta: true,
    tripIdKind: 'generic',
    crewDigest: false,
  },
  {
    airlineCode: 'FFT',
    displayName: 'Frontier',
    host: 'frontier.flica.net',
    beta: true,
    tripIdKind: 'generic',
    crewDigest: false,
  },
  {
    airlineCode: 'PDT',
    displayName: 'Piedmont',
    host: 'pdt.flica.net',
    beta: true,
    unsupportedReason: 'airline_sso',
    tripIdKind: 'generic',
    crewDigest: false,
  },
  {
    airlineCode: 'HAL',
    displayName: 'Hawaiian',
    host: 'hal.flica.net',
    beta: true,
    tripIdKind: 'generic',
    crewDigest: false,
  },
  {
    // Crew now sign in at psa.flica.net via American Airlines PingFederate (idp.aa.com); moved 2024-09-12.
    airlineCode: 'JIA',
    displayName: 'PSA Airlines',
    host: 'jia.flica.net',
    beta: true,
    unsupportedReason: 'airline_sso',
    tripIdKind: 'generic',
    crewDigest: false,
  },
  {
    airlineCode: 'NKS',
    displayName: 'Spirit Airlines',
    host: 'spirit.flica.net',
    beta: true,
    tripIdKind: 'generic',
    crewDigest: false,
  },
  {
    airlineCode: 'WJA',
    displayName: 'WestJet',
    host: 'wja.flica.net',
    beta: true,
    tripIdKind: 'generic',
    crewDigest: false,
  },
]

const BY_CODE = new Map(FLICA_CARRIERS.map((carrier) => [carrier.airlineCode, carrier]))

export function flicaAirlineSsoUserMessage(displayName: string): string {
  return `${displayName} now signs in to FLICA through airline single sign-on, which Autofi can't use yet. Your FLICA login was not used. You can disconnect it below.`
}

export function flicaAirlineUnavailableUserMessage(displayName: string): string {
  return `Autofi isn't available for ${displayName} yet. You can disconnect your saved FLICA login below.`
}

export function isFlicaCarrierEnabled(
  airlineCode?: string | null,
  allowlist: readonly string[] = ENABLED_FLICA_AIRLINE_CODES
): boolean {
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (!code || !BY_CODE.has(code)) return false
  return allowlist.includes(code)
}

export function isFlicaCarrierSupported(airlineCode?: string | null): boolean {
  const carrier = findFlicaCarrier(airlineCode)
  if (!carrier) return false
  return carrier.unsupportedReason !== 'airline_sso'
}

/** Offered in the connect picker: on the enable allowlist and not airline-SSO blocked. */
export function isFlicaCarrierSelectable(airlineCode?: string | null): boolean {
  return isFlicaCarrierEnabled(airlineCode) && isFlicaCarrierSupported(airlineCode)
}

/** Republic first, then display name. Stable for the airline picker. */
export function listFlicaCarriers(): FlicaCarrier[] {
  const republic = FLICA_CARRIERS.filter((c) => c.airlineCode === DEFAULT_FLICA_AIRLINE_CODE)
  const rest = FLICA_CARRIERS.filter((c) => c.airlineCode !== DEFAULT_FLICA_AIRLINE_CODE).sort(
    (a, b) => a.displayName.localeCompare(b.displayName)
  )
  return [...republic, ...rest]
}

/** Carriers Autofi may offer in the connect picker (entries stay in FLICA_CARRIERS). */
export function listSelectableFlicaCarriers(
  allowlist: readonly string[] = ENABLED_FLICA_AIRLINE_CODES
): FlicaCarrier[] {
  return listFlicaCarriers().filter(
    (carrier) =>
      isFlicaCarrierEnabled(carrier.airlineCode, allowlist) &&
      isFlicaCarrierSupported(carrier.airlineCode)
  )
}

export function findFlicaCarrier(airlineCode?: string | null): FlicaCarrier | null {
  const code = (airlineCode ?? '').trim().toUpperCase()
  if (!code) return BY_CODE.get(DEFAULT_FLICA_AIRLINE_CODE) ?? null
  return BY_CODE.get(code) ?? null
}

/**
 * Existing RJET rows win. Otherwise the first connected airline. Empty falls
 * back to Republic so a new user still lands on the verified default.
 */
export function preferredFlicaAirlineCode(connectedCodes: readonly string[]): string {
  const codes = connectedCodes
    .map((code) => code.trim().toUpperCase())
    .filter(
      (code) =>
        code.length > 0 &&
        BY_CODE.has(code) &&
        isFlicaCarrierSelectable(code)
    )
  if (codes.includes(DEFAULT_FLICA_AIRLINE_CODE)) return DEFAULT_FLICA_AIRLINE_CODE
  return codes[0] ?? DEFAULT_FLICA_AIRLINE_CODE
}

/** True only for airlines that have a shared crew-name digest loaded. */
export function airlineHasActiveCrewDigest(airlineCode?: string | null): boolean {
  return findFlicaCarrier(airlineCode)?.crewDigest === true
}
