import {
  airlineHasActiveCrewDigest,
  findFlicaCarrier,
  flicaAirlineSsoUserMessage,
  flicaAirlineUnavailableUserMessage,
  isFlicaCarrierEnabled,
  listSelectableFlicaCarriers,
  DEFAULT_FLICA_AIRLINE_CODE,
  type FlicaCarrier,
} from '../../shared/flicaCarriers'
import { GENERIC_FLICA_TRIP_ID_PATTERN, REPUBLIC_TRIP_ID_PATTERN } from '../../shared/flicaTripId'

export interface FlicaPortalConfig {
  airlineCode: string
  host: string
  label: string
  /** Prefixed onto employee numbers when the user enters digits only. */
  userIdPrefix?: string
  beta: boolean
  crewDigest: boolean
  /** Pairing-id regex source. Republic's base-letter shape, or the generic one. */
  tripIdPattern: string
}

export class FlicaUnsupportedAirlineError extends Error {
  readonly code = 'airline_sso' as const
  readonly airlineCode: string
  readonly displayName: string

  constructor(carrier: FlicaCarrier) {
    super(flicaAirlineSsoUserMessage(carrier.displayName))
    this.name = 'FlicaUnsupportedAirlineError'
    this.airlineCode = carrier.airlineCode
    this.displayName = carrier.displayName
  }
}

export class FlicaDisabledAirlineError extends Error {
  readonly code = 'not_enabled' as const
  readonly airlineCode: string
  readonly displayName: string

  constructor(carrier: FlicaCarrier) {
    super(flicaAirlineUnavailableUserMessage(carrier.displayName))
    this.name = 'FlicaDisabledAirlineError'
    this.airlineCode = carrier.airlineCode
    this.displayName = carrier.displayName
  }
}

function tripIdPatternFor(carrier: FlicaCarrier): string {
  return carrier.tripIdKind === 'republic'
    ? REPUBLIC_TRIP_ID_PATTERN
    : GENERIC_FLICA_TRIP_ID_PATTERN
}

function toPortal(carrier: FlicaCarrier): FlicaPortalConfig {
  return {
    airlineCode: carrier.airlineCode,
    host: carrier.host,
    label: carrier.displayName,
    userIdPrefix: carrier.userIdPrefix,
    beta: carrier.beta,
    crewDigest: carrier.crewDigest,
    tripIdPattern: tripIdPatternFor(carrier),
  }
}

export function listFlicaPortals(): FlicaPortalConfig[] {
  return listSelectableFlicaCarriers().map(toPortal)
}

export function resolveFlicaPortal(airlineCode?: string | null): FlicaPortalConfig {
  const raw = (airlineCode ?? '').trim()
  const code = (raw || DEFAULT_FLICA_AIRLINE_CODE).toUpperCase()
  const carrier = findFlicaCarrier(code)
  if (!carrier || carrier.airlineCode !== code) {
    throw new Error(`Unsupported FLICA airline code: ${code}`)
  }
  if (carrier.unsupportedReason === 'airline_sso') {
    throw new FlicaUnsupportedAirlineError(carrier)
  }
  if (!isFlicaCarrierEnabled(carrier.airlineCode)) {
    throw new FlicaDisabledAirlineError(carrier)
  }
  return toPortal(carrier)
}

export { airlineHasActiveCrewDigest, flicaAirlineSsoUserMessage, flicaAirlineUnavailableUserMessage }

/**
 * Normalize FLICA User ID. When the carrier has a confirmed prefix, digits-only
 * input (100001) becomes that prefix plus the digits. Otherwise the value is
 * stored as entered.
 */
export function normalizeFlicaUserId(raw: string, portal: FlicaPortalConfig): string {
  const id = raw.trim()
  if (!id) return ''
  if (/^\d+$/.test(id) && portal.userIdPrefix) {
    return `${portal.userIdPrefix}${id}`
  }
  return id
}